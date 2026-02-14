/**
 * TfxManager - Manages tfx-cli installation, caching, and execution
 */

import path from 'path';
import fs from 'fs/promises';
import type { IPlatformAdapter } from './platform.js';
import { JsonOutputStream } from './json-output-stream.js';

/**
 * Options for TfxManager
 */
export interface TfxManagerOptions {
  /** Version of tfx to use: "embedded" or semver (e.g., "0.17.x", "latest") */
  version: string;
  /** Platform adapter for operations */
  platform: IPlatformAdapter;
}

/**
 * Options for executing tfx
 */
export interface TfxExecOptions {
  /** Working directory */
  cwd?: string;
  /** Additional environment variables */
  env?: Record<string, string>;
  /** Capture JSON output (adds --json and --debug-log-stream stderr flags) */
  captureJson?: boolean;
}

/**
 * Result from tfx execution
 */
export interface TfxResult {
  /** Exit code from tfx process */
  exitCode: number;
  /** Parsed JSON output (if captureJson was true and JSON was present) */
  json?: unknown;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
}

/**
 * Manages tfx-cli binary resolution, caching, and execution
 */
export class TfxManager {
  private resolvedPath?: string;
  private readonly version: string;
  private readonly platform: IPlatformAdapter;

  constructor(options: TfxManagerOptions) {
    this.version = options.version;
    this.platform = options.platform;
  }

  /**
   * Resolve tfx binary path using cache-first strategy
   * @returns Path to tfx executable
   */
  async resolve(): Promise<string> {
    // 1. In-memory cache (same process invocation)
    if (this.resolvedPath) {
      this.platform.debug(`Using cached tfx path: ${this.resolvedPath}`);
      return this.resolvedPath;
    }

    // 2. Embedded mode - locate bundled tfx
    if (this.version === 'embedded') {
      this.resolvedPath = await this.resolveEmbedded();
      return this.resolvedPath;
    }

    // 3. Check platform tool cache (cross-step reuse)
    const cachedPath = this.platform.findCachedTool('tfx-cli', this.version);
    if (cachedPath) {
      this.platform.info(`Found cached tfx-cli@${this.version} at ${cachedPath}`);
      this.resolvedPath = this.getTfxExecutable(cachedPath);
      return this.resolvedPath;
    }

    // 4. Download and cache
    this.resolvedPath = await this.downloadAndCache();
    return this.resolvedPath;
  }

  /**
   * Resolve embedded tfx binary
   */
  private async resolveEmbedded(): Promise<string> {
    // For embedded mode, tfx should be bundled with the task/action
    // The exact location depends on how it's packaged
    // For now, use 'which' to find it on PATH
    this.platform.info('Using embedded tfx-cli from PATH');
    const tfxPath = await this.platform.which('tfx', true);
    return tfxPath;
  }

  /**
   * Download tfx from npm and cache it
   * Uses npm install to download tfx-cli and all its dependencies
   * This matches the behavior of the previous tfxinstaller task
   */
  private async downloadAndCache(): Promise<string> {
    this.platform.info(`Installing tfx-cli@${this.version} from npm...`);

    // Create temp directory for installation
    const tempDir = this.platform.getTempDir();
    const installDir = path.join(tempDir, `tfx-install-${Date.now()}`);
    await fs.mkdir(installDir, { recursive: true });

    try {
      // Step 1: Run npm install to download tfx-cli and all dependencies
      // This installs into node_modules/tfx-cli with full dependency tree
      this.platform.debug(`Running npm install tfx-cli@${this.version} in ${installDir}`);
      const npmPath = await this.platform.which('npm', true);
      const exitCode = await this.platform.exec(
        npmPath,
        ['install', `tfx-cli@${this.version}`, '--production', '--no-save', '--no-package-lock'],
        { cwd: installDir }
      );

      if (exitCode !== 0) {
        throw new Error(`npm install failed with exit code ${exitCode}`);
      }

      // Step 2: Verify node_modules/tfx-cli exists
      const tfxPackageDir = path.join(installDir, 'node_modules', 'tfx-cli');
      try {
        await fs.access(tfxPackageDir);
      } catch {
        throw new Error(`tfx-cli not found at ${tfxPackageDir} after npm install`);
      }

      this.platform.info(`Successfully installed tfx-cli@${this.version} with dependencies`);

      // Step 3: Cache the entire node_modules directory structure
      // This preserves the full dependency tree for tfx to work correctly
      this.platform.info(`Caching tfx-cli@${this.version}...`);
      const nodeModulesDir = path.join(installDir, 'node_modules');
      const cachedDir = await this.platform.cacheDir(nodeModulesDir, 'tfx-cli', this.version);
      this.platform.info(`Cached tfx-cli@${this.version} to ${cachedDir}`);

      // Step 4: Return path to tfx executable
      // The tfx executable is in tfx-cli/bin/tfx within the cached node_modules
      const binDir = path.join(cachedDir, 'tfx-cli', 'bin');
      return this.getTfxExecutable(binDir);
    } catch (error) {
      // If install fails, fall back to PATH as last resort
      this.platform.warning(
        `Failed to install tfx-cli@${this.version}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.platform.warning('Falling back to tfx from PATH');
      
      try {
        const tfxPath = await this.platform.which('tfx', true);
        return tfxPath;
      } catch (fallbackError) {
        throw new Error(
          `Failed to install tfx-cli@${this.version} and no tfx found in PATH. ` +
          `Original error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } finally {
      // Clean up temp directory
      try {
        await this.platform.rmRF(installDir);
        this.platform.debug(`Cleaned up temp directory: ${installDir}`);
      } catch (cleanupError) {
        this.platform.warning(
          `Failed to clean up temp directory ${installDir}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
        );
      }
    }
  }

  /**
   * Get tfx executable path from directory
   * On Windows, prefers tfx.cmd over tfx
   */
  private getTfxExecutable(dir: string): string {
    // On Windows, prefer .cmd wrapper
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const cmdPath = path.join(dir, 'tfx.cmd');
      return cmdPath;
    }
    return path.join(dir, 'tfx');
  }

  /**
   * Execute tfx with given arguments
   * @param args Arguments to pass to tfx
   * @param options Execution options
   * @returns Result with exit code and output
   */
  async execute(args: string[], options?: TfxExecOptions): Promise<TfxResult> {
    const tfxPath = await this.resolve();

    // Add JSON output flags if requested
    const finalArgs = [...args];
    let jsonStream: JsonOutputStream | undefined;

    if (options?.captureJson) {
      // Add tfx flags for JSON output
      if (!finalArgs.includes('--json')) {
        finalArgs.push('--json');
      }
      if (!finalArgs.includes('--debug-log-stream')) {
        finalArgs.push('--debug-log-stream', 'stderr');
      }

      // Create JSON output stream
      jsonStream = new JsonOutputStream((msg) => this.platform.debug(msg));
    }

    // Build exec options
    const execOptions = {
      cwd: options?.cwd,
      env: options?.env,
      outStream: jsonStream,
      errStream: undefined as NodeJS.WritableStream | undefined,
    };

    // Execute tfx
    this.platform.info(`Executing: ${tfxPath} ${finalArgs.join(' ')}`);
    const exitCode = await this.platform.exec(tfxPath, finalArgs, execOptions);

    // Parse JSON if captured
    let parsedJson: unknown | undefined;
    if (jsonStream) {
      parsedJson = jsonStream.parseJson();
    }

    return {
      exitCode,
      json: parsedJson,
      stdout: jsonStream?.jsonString || '',
      stderr: '',
    };
  }
}
