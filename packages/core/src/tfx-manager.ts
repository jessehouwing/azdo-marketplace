/**
 * TfxManager - Manages tfx-cli installation, caching, and execution
 */

import fs from 'fs/promises';
import path from 'path';
import { Writable } from 'stream';
import { JsonOutputStream } from './json-output-stream.js';
import type { IPlatformAdapter } from './platform.js';

class TextCaptureStream extends Writable {
  public content = '';

  constructor(private readonly lineWriter: (message: string) => void) {
    super();
  }

  _write(
    chunk: Buffer | string,
    _encoding: string,
    callback: (error?: Error | null) => void
  ): void {
    const text = chunk.toString();
    this.content += text;

    text.split('\n').forEach((line) => {
      if (line) {
        this.lineWriter(line);
      }
    });

    callback();
  }
}

/**
 * Options for TfxManager
 */
export interface TfxManagerOptions {
  /**
   * Version of tfx to use:
   * - "built-in": Use tfx-cli from core package dependencies
   * - "path": Use tfx from system PATH
   * - Version spec: Download and cache (e.g., "0.17.0", "^0.17", "latest")
   */
  tfxVersion: string;
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
  /** Override command silence behavior */
  silent?: boolean;
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
  private readonly tfxVersion: string;
  private readonly platform: IPlatformAdapter;

  constructor(options: TfxManagerOptions) {
    this.tfxVersion = options.tfxVersion;
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

    // 2. Built-in mode - use tfx from core package dependencies
    if (this.tfxVersion === 'built-in') {
      this.resolvedPath = await this.resolveBuiltIn();
      return this.resolvedPath;
    }

    // 3. Path mode - use tfx from system PATH (no download)
    if (this.tfxVersion === 'path') {
      this.resolvedPath = await this.resolveFromPath();
      return this.resolvedPath;
    }

    // 4. Version spec - resolve to exact version first
    const exactVersion = await this.resolveVersionSpec(this.tfxVersion);
    this.platform.info(
      `Resolved tfx-cli version spec '${this.tfxVersion}' to exact version '${exactVersion}'`
    );

    // 5. Check platform tool cache (cross-step reuse)
    const cachedPath = this.platform.findCachedTool('tfx-cli', exactVersion);
    if (cachedPath) {
      this.platform.info(`Found cached tfx-cli@${exactVersion} at ${cachedPath}`);
      this.resolvedPath = this.getTfxExecutable(cachedPath);
      return this.resolvedPath;
    }

    // 6. Download and cache exact version
    this.resolvedPath = await this.downloadAndCache(exactVersion);
    return this.resolvedPath;
  }

  /**
   * Resolve built-in tfx binary from core package dependencies
   * Similar to tfxinstaller v5 behavior
   *
   * The tfx-cli package is a direct dependency of the core package.
   * When bundled, tfx-cli is marked as external and will be in node_modules.
   * We use 'which' to locate it, which will find it in node_modules/.bin/ or PATH.
   */
  private async resolveBuiltIn(): Promise<string> {
    this.platform.info('Using built-in tfx-cli from core package dependencies');

    const entrypoint = process.argv[1];
    if (!entrypoint) {
      throw new Error('Built-in tfx-cli resolution failed: process.argv[1] is not set.');
    }

    const entryDir = path.dirname(path.resolve(entrypoint));
    const tfxExecutable = process.platform === 'win32' ? 'tfx.cmd' : 'tfx';
    const candidateDirs = [entryDir];
    const normalizedEntrypoint = path.resolve(entrypoint).replace(/\\/g, '/');

    if (normalizedEntrypoint.includes('/node_modules/')) {
      candidateDirs.push(process.cwd());
    }

    for (const candidateDir of candidateDirs) {
      const jsEntrypoint = path.join(
        candidateDir,
        'node_modules',
        'tfx-cli',
        '_build',
        'tfx-cli.js'
      );
      if (await this.pathExists(jsEntrypoint)) {
        this.platform.debug(`Resolved built-in tfx-cli JS entrypoint at: ${jsEntrypoint}`);
        return jsEntrypoint;
      }

      const builtInPath = path.join(candidateDir, 'node_modules', '.bin', tfxExecutable);

      if (await this.pathExists(builtInPath)) {
        this.platform.debug(`Resolved built-in tfx at: ${builtInPath}`);
        return builtInPath;
      }
    }

    throw new Error(
      `Built-in tfx-cli not found at expected path: ${path.join(entryDir, 'node_modules', '.bin', tfxExecutable)}.`
    );
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve tfx from system PATH
   * No download, uses whatever tfx is installed on the system
   */
  private async resolveFromPath(): Promise<string> {
    this.platform.info('Using tfx-cli from system PATH');

    // Find tfx on PATH
    const tfxPath = await this.platform.which('tfx', true);

    this.platform.debug(`Resolved tfx from PATH at: ${tfxPath}`);
    return tfxPath;
  }

  /**
   * Resolve a version spec to an exact version
   * Uses npm to resolve version specs like "^0.17", "latest", etc.
   * @param versionSpec - Version spec to resolve (e.g., "^0.17", "latest", "0.17.0")
   * @returns Exact version string (e.g., "0.17.3")
   */
  private async resolveVersionSpec(versionSpec: string): Promise<string> {
    this.platform.debug(`Resolving version spec: ${versionSpec}`);

    try {
      // Use npm view to get the exact version
      const npmPath = await this.platform.which('npm', true);

      // Create a temp buffer to capture output
      let output = '';
      const outStream: any = {
        write: (data: string) => {
          output += data;
        },
      };

      const exitCode = await this.platform.exec(
        npmPath,
        ['view', `tfx-cli@${versionSpec}`, 'version', '--json'],
        { outStream }
      );

      if (exitCode !== 0) {
        throw new Error(`npm view failed with exit code ${exitCode}`);
      }

      // Parse the output
      const trimmed = output.trim();
      let exactVersion: string;

      if (trimmed.startsWith('[')) {
        // Multiple versions returned, take the last one (latest)
        const versions = JSON.parse(trimmed) as string[];
        exactVersion = versions[versions.length - 1];
      } else if (trimmed.startsWith('"')) {
        // Single version as JSON string
        exactVersion = JSON.parse(trimmed) as string;
      } else {
        // Plain version string
        exactVersion = trimmed;
      }

      this.platform.debug(`Resolved '${versionSpec}' to exact version '${exactVersion}'`);
      return exactVersion;
    } catch (error) {
      const wrappedError = new Error(
        `Failed to resolve tfx-cli version spec '${versionSpec}': ${
          error instanceof Error ? error.message : String(error)
        }`
      ) as Error & { cause?: unknown };
      wrappedError.cause = error;
      throw wrappedError;
    }
  }

  /**
   * Download tfx from npm and cache it
   * Uses npm install to download tfx-cli and all its dependencies
   * This matches the behavior of the previous tfxinstaller task
   * @param exactVersion - Exact version to download (e.g., "0.17.3")
   */
  private async downloadAndCache(exactVersion: string): Promise<string> {
    this.platform.info(`Installing tfx-cli@${exactVersion} from npm...`);

    // Create temp directory for installation
    const tempDir = this.platform.getTempDir();
    const installDir = path.join(tempDir, `tfx-install-${Date.now()}`);
    await fs.mkdir(installDir, { recursive: true });

    try {
      // Step 1: Run npm install to download tfx-cli and all dependencies
      // This installs into node_modules/tfx-cli with full dependency tree
      this.platform.debug(`Running npm install tfx-cli@${exactVersion} in ${installDir}`);
      const npmPath = await this.platform.which('npm', true);
      const exitCode = await this.platform.exec(
        npmPath,
        ['install', `tfx-cli@${exactVersion}`, '--production', '--no-save', '--no-package-lock'],
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

      this.platform.info(`Successfully installed tfx-cli@${exactVersion} with dependencies`);

      // Step 3: Make tfx executable on Unix systems
      await this.ensureExecutable(tfxPackageDir);

      // Step 4: Cache the entire node_modules directory structure
      // This preserves the full dependency tree for tfx to work correctly
      this.platform.info(`Caching tfx-cli@${exactVersion}...`);
      const nodeModulesDir = path.join(installDir, 'node_modules');
      const cachedDir = await this.platform.cacheDir(nodeModulesDir, 'tfx-cli', exactVersion);
      this.platform.info(`Cached tfx-cli@${exactVersion} to ${cachedDir}`);

      // Step 5: Return path to tfx executable
      // The tfx executable is in tfx-cli/bin/ within the cached node_modules
      const binDir = path.join(cachedDir, 'tfx-cli', 'bin');
      return this.getTfxExecutable(binDir);
    } catch (error) {
      // If install fails, fall back to PATH as last resort
      this.platform.warning(
        `Failed to install tfx-cli@${exactVersion}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.platform.warning('Falling back to tfx from PATH');

      try {
        const tfxPath = await this.platform.which('tfx', true);
        return tfxPath;
      } catch {
        throw new Error(
          `Failed to install tfx-cli@${exactVersion} and no tfx found in PATH. ` +
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
   * Ensure tfx binary is executable on Unix systems
   * @param tfxPackageDir - Path to tfx-cli package directory
   */
  private async ensureExecutable(tfxPackageDir: string): Promise<void> {
    // Only needed on Unix systems
    if (process.platform === 'win32') {
      this.platform.debug('Skipping chmod on Windows');
      return;
    }

    try {
      const tfxBin = path.join(tfxPackageDir, 'bin', 'tfx');
      await fs.chmod(tfxBin, 0o755);
      this.platform.debug(`Made tfx executable: ${tfxBin}`);
    } catch (error) {
      this.platform.warning(`Failed to chmod tfx: ${error}`);
    }
  }

  /**
   * Get tfx executable path from directory
   * On Windows, uses tfx.cmd or tfx.ps1
   * On Unix, uses tfx (made executable via chmod)
   */
  private getTfxExecutable(dir: string): string {
    // On Windows, prefer .cmd wrapper, fallback to .ps1
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const cmdPath = path.join(dir, 'tfx.cmd');
      // Note: We return tfx.cmd even if it doesn't exist yet
      // npm install will create it
      return cmdPath;
    }
    // On Unix, use the tfx binary (will be made executable)
    return path.join(dir, 'tfx');
  }

  private logCapturedOutput(streamName: 'stdout' | 'stderr', content: string): void {
    this.platform.debug(`Captured tfx ${streamName}:`);
    const normalized = content.replace(/\r\n/g, '\n').trim();
    if (!normalized) {
      this.platform.debug(`[tfx ${streamName}] <empty>`);
      return;
    }

    normalized.split('\n').forEach((line) => {
      this.platform.debug(`[tfx ${streamName}] ${line}`);
    });
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
    const stdoutStream = new TextCaptureStream((msg) => this.platform.debug(msg));
    const stderrStream = new TextCaptureStream((msg) => this.platform.debug(msg));

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
    const defaultSilent = !this.platform.isDebugEnabled();
    const execOptions = {
      cwd: options?.cwd,
      env: options?.env,
      silent: options?.silent ?? defaultSilent,
      ignoreReturnCode: true,
      outStream: (jsonStream ?? stdoutStream) as unknown as NodeJS.WritableStream,
      errStream: stderrStream as unknown as NodeJS.WritableStream,
    };

    // Execute tfx
    let executable = tfxPath;
    let executableArgs = [...finalArgs];
    if (tfxPath.endsWith('.js')) {
      const nodePath = await this.platform.which('node', true);
      executable = nodePath;
      executableArgs = [tfxPath, ...finalArgs];
    }

    this.platform.debug(`Executing: ${executable} ${executableArgs.join(' ')}`);
    const exitCode = await this.platform.exec(executable, executableArgs, execOptions);

    // Parse JSON if captured
    let parsedJson: unknown | undefined;
    if (jsonStream) {
      parsedJson = jsonStream.parseJson();
    }

    const stdout = jsonStream
      ? `${jsonStream.messages.join('')}${jsonStream.jsonString}`
      : stdoutStream.content;
    const stderr = stderrStream.content;

    if (this.platform.isDebugEnabled()) {
      this.logCapturedOutput('stdout', stdout);
      this.logCapturedOutput('stderr', stderr);
    }

    return {
      exitCode,
      json: parsedJson,
      stdout,
      stderr,
    };
  }
}
