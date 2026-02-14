/**
 * TfxManager - Manages tfx-cli installation, caching, and execution
 */

import path from 'path';
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
   */
  private async downloadAndCache(): Promise<string> {
    this.platform.info(`Downloading tfx-cli@${this.version} from npm...`);

    // Download tfx-cli package
    // In a real implementation, we would:
    // 1. Run: npm pack tfx-cli@version in temp dir
    // 2. Extract the tarball
    // 3. Cache the extracted directory
    // For now, we'll use a placeholder implementation

    // TODO: Implement actual npm pack + extract logic
    // For now, just try to find tfx on PATH as fallback
    this.platform.warning(
      'TfxManager.downloadAndCache not fully implemented - using tfx from PATH'
    );

    const tfxPath = await this.platform.which('tfx', true);

    // Cache for future use
    const tfxDir = path.dirname(tfxPath);
    const cachedDir = await this.platform.cacheDir(tfxDir, 'tfx-cli', this.version);
    this.platform.info(`Cached tfx-cli@${this.version} to ${cachedDir}`);

    return this.getTfxExecutable(cachedDir);
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
