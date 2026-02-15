/**
 * VSIX Reader - Read-only operations for VSIX files
 * 
 * Provides chainable API for reading VSIX archives and extracting manifests.
 * Completely separate from editing and writing concerns.
 * 
 * Security: Protected against zip slip attacks with path validation.
 */

import yauzl from 'yauzl';
import { Buffer } from 'buffer';
import { normalize, isAbsolute } from 'path';

/**
 * Validate that a path from a ZIP file is safe and doesn't escape the extraction directory
 * Protects against zip slip vulnerabilities
 * @param filePath Path from ZIP entry
 * @throws Error if path is unsafe
 */
function validateZipPath(filePath: string): void {
  // Normalize the path to resolve any .. or . segments
  const normalizedPath = normalize(filePath);
  
  // Check for absolute paths (e.g., /etc/passwd or C:\Windows\System32)
  if (isAbsolute(normalizedPath)) {
    throw new Error(`Security: Absolute paths are not allowed in VSIX files: ${filePath}`);
  }
  
  // Check if the normalized path tries to escape upward (starts with ..)
  if (normalizedPath.startsWith('..') || normalizedPath.includes(`${normalize('../')}`)) {
    throw new Error(`Security: Path traversal detected in VSIX file: ${filePath}`);
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.[\/\\]/,  // Parent directory references
    /^[\/\\]/,     // Root references
    /[<>:"|?*]/,   // Windows invalid filename characters (except for paths)
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filePath)) {
      throw new Error(`Security: Suspicious pattern detected in path: ${filePath}`);
    }
  }
  
  // Validate that the path doesn't contain null bytes (another attack vector)
  if (filePath.includes('\0')) {
    throw new Error(`Security: Null byte detected in path: ${filePath}`);
  }
}

/**
 * Extension manifest from vss-extension.json
 */
export interface ExtensionManifest {
  manifestVersion?: number;
  id: string;
  publisher: string;
  version: string;
  name?: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  targets?: Array<{ id: string }>;
  icons?: Record<string, string>;
  content?: Record<string, string>;
  files?: Array<{ path: string }>;
  contributions?: Array<{
    id: string;
    type: string;
    targets?: string[];
    properties?: Record<string, unknown>;
  }>;
  [key: string]: unknown;
}

/**
 * Task manifest from task.json
 */
export interface TaskManifest {
  id: string;
  name: string;
  friendlyName: string;
  description: string;
  version: {
    Major: number;
    Minor: number;
    Patch: number;
  };
  instanceNameFormat?: string;
  inputs?: Array<{
    name: string;
    type: string;
    label: string;
    required?: boolean;
    defaultValue?: string;
    [key: string]: unknown;
  }>;
  execution?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * File entry in VSIX archive
 */
export interface VsixFile {
  path: string;
  size: number;
  compressedSize: number;
}

/**
 * Quick metadata access
 */
export interface VsixMetadata {
  publisher: string;
  extensionId: string;
  version: string;
  name?: string;
  description?: string;
}

/**
 * Task information
 */
export interface TaskInfo {
  name: string;
  friendlyName: string;
  version: string;
  path: string;
}

/**
 * VsixReader - Read-only VSIX file operations
 * 
 * Example usage:
 * ```typescript
 * const reader = await VsixReader.open('/path/to/extension.vsix');
 * const manifest = await reader.readExtensionManifest();
 * const tasks = await reader.readTaskManifests();
 * await reader.close();
 * ```
 * 
 * Or chained:
 * ```typescript
 * const reader = await VsixReader.open('/path/to/extension.vsix');
 * const [manifest, tasks] = await Promise.all([
 *   reader.readExtensionManifest(),
 *   reader.readTaskManifests()
 * ]);
 * await reader.close();
 * ```
 */
export class VsixReader {
  private zipFile: yauzl.ZipFile | null = null;
  private readonly vsixPath: string;
  private fileCache: Map<string, Buffer> = new Map();
  private entriesCache: yauzl.Entry[] | null = null;

  private constructor(vsixPath: string) {
    this.vsixPath = vsixPath;
  }

  /**
   * Open a VSIX file for reading
   * @param vsixPath Path to the VSIX file
   * @returns VsixReader instance
   */
  static async open(vsixPath: string): Promise<VsixReader> {
    const reader = new VsixReader(vsixPath);
    await reader.openZip();
    return reader;
  }

  /**
   * Open the ZIP file
   */
  private async openZip(): Promise<void> {
    return new Promise((resolve, reject) => {
      yauzl.open(
        this.vsixPath, 
        { 
          lazyEntries: true, 
          strictFileNames: false, 
          validateEntrySizes: false,
          autoClose: false  // Keep file open for multiple read operations
        }, 
        (err: Error | null, zipFile?: yauzl.ZipFile) => {
          if (err) {
            reject(new Error(`Failed to open VSIX file: ${err.message}`));
            return;
          }
          this.zipFile = zipFile!;
          resolve();
        }
      );
    });
  }

  /**
   * Read all entries from the ZIP file
   * Validates all paths for security (zip slip protection)
   */
  private async readEntries(): Promise<yauzl.Entry[]> {
    if (this.entriesCache) {
      return this.entriesCache;
    }

    if (!this.zipFile) {
      throw new Error('VSIX file is not open');
    }

    return new Promise((resolve, reject) => {
      const entries: yauzl.Entry[] = [];
      
      const onEntry = (entry: yauzl.Entry) => {
        try {
          // Validate path for security
          validateZipPath(entry.fileName);
          entries.push(entry);
        } catch (err) {
          // Security violation - reject the entire operation
          this.zipFile!.removeListener('entry', onEntry);
          this.zipFile!.removeListener('end', onEnd);
          this.zipFile!.removeListener('error', onError);
          reject(err);
          return;
        }
        this.zipFile!.readEntry();
      };

      const onEnd = () => {
        this.zipFile!.removeListener('entry', onEntry);
        this.zipFile!.removeListener('end', onEnd);
        this.zipFile!.removeListener('error', onError);
        this.entriesCache = entries;
        resolve(entries);
      };

      const onError = (err: Error) => {
        this.zipFile!.removeListener('entry', onEntry);
        this.zipFile!.removeListener('end', onEnd);
        this.zipFile!.removeListener('error', onError);
        reject(new Error(`Error reading VSIX entries: ${err.message}`));
      };

      this.zipFile!.on('entry', onEntry);
      this.zipFile!.on('end', onEnd);
      this.zipFile!.on('error', onError);

      this.zipFile!.readEntry();
    });
  }

  /**
   * Read a specific file from the VSIX
   * @param filePath Path to the file within the VSIX
   * @returns File contents as Buffer
   */
  async readFile(filePath: string): Promise<Buffer> {
    // Validate path for security (zip slip protection)
    validateZipPath(filePath);
    
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Check cache
    if (this.fileCache.has(normalizedPath)) {
      return this.fileCache.get(normalizedPath)!;
    }

    if (!this.zipFile) {
      throw new Error('VSIX file is not open');
    }

    const entries = await this.readEntries();
    const entry = entries.find(e => e.fileName === normalizedPath);

    if (!entry) {
      throw new Error(`File not found in VSIX: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
      this.zipFile!.openReadStream(entry, (err: Error | null, readStream?: any) => {
        if (err || !readStream) {
          reject(new Error(`Failed to read file ${filePath}: ${err?.message || 'No stream'}`));
          return;
        }

        const chunks: Buffer[] = [];
        readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        readStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.fileCache.set(normalizedPath, buffer);
          resolve(buffer);
        });
        readStream.on('error', (streamErr: Error) => {
          reject(new Error(`Error reading file ${filePath}: ${streamErr.message}`));
        });
      });
    });
  }

  /**
   * Check if a file exists in the VSIX
   * @param filePath Path to check
   * @returns True if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const entries = await this.readEntries();
    return entries.some(e => e.fileName === normalizedPath);
  }

  /**
   * List all files in the VSIX
   * @returns Array of file information
   */
  async listFiles(): Promise<VsixFile[]> {
    const entries = await this.readEntries();
    return entries
      .filter(e => !e.fileName.endsWith('/')) // Exclude directories
      .map(e => ({
        path: e.fileName,
        size: e.uncompressedSize,
        compressedSize: e.compressedSize
      }));
  }

  /**
   * Read the extension manifest (vss-extension.json or extension.vsixmanifest)
   * @returns Parsed extension manifest
   */
  async readExtensionManifest(): Promise<ExtensionManifest> {
    // Try vss-extension.json first (standard)
    if (await this.fileExists('extension.vsomanifest')) {
      const buffer = await this.readFile('extension.vsomanifest');
      return JSON.parse(buffer.toString('utf-8'));
    }
    
    if (await this.fileExists('vss-extension.json')) {
      const buffer = await this.readFile('vss-extension.json');
      return JSON.parse(buffer.toString('utf-8'));
    }

    throw new Error('Extension manifest not found in VSIX (expected vss-extension.json or extension.vsomanifest)');
  }

  /**
   * Find task directories from the extension manifest
   * @returns Array of task directory paths
   */
  async findTaskPaths(): Promise<string[]> {
    const manifest = await this.readExtensionManifest();
    const taskPathsSet = new Set<string>();

    // Look for task contributions
    if (manifest.contributions) {
      for (const contribution of manifest.contributions) {
        if (contribution.type === 'ms.vss-distributed-task.task' && contribution.properties) {
          const name = contribution.properties.name as string;
          if (name) {
            taskPathsSet.add(name);
          }
        }
      }
    }

    // Look for files array (only if no contributions found)
    if (taskPathsSet.size === 0 && manifest.files) {
      const entries = await this.readEntries();
      for (const file of manifest.files) {
        // Task directories typically contain task.json
        const taskJsonPath = `${file.path}/task.json`.replace(/\\/g, '/');
        if (entries.some(e => e.fileName === taskJsonPath)) {
          taskPathsSet.add(file.path);
        }
      }
    }

    return Array.from(taskPathsSet);
  }

  /**
   * Read a task manifest (task.json)
   * @param taskPath Path to the task directory
   * @returns Parsed task manifest
   */
  async readTaskManifest(taskPath: string): Promise<TaskManifest> {
    const taskJsonPath = `${taskPath}/task.json`.replace(/\\/g, '/');
    const buffer = await this.readFile(taskJsonPath);
    return JSON.parse(buffer.toString('utf-8'));
  }

  /**
   * Read all task manifests in the VSIX
   * @returns Array of task manifests with their paths
   */
  async readTaskManifests(): Promise<Array<{ path: string; manifest: TaskManifest }>> {
    const taskPaths = await this.findTaskPaths();
    const results: Array<{ path: string; manifest: TaskManifest }> = [];

    for (const taskPath of taskPaths) {
      try {
        const manifest = await this.readTaskManifest(taskPath);
        results.push({ path: taskPath, manifest });
      } catch (_err) {
        // Skip tasks that don't have valid task.json
        // Silently continue - caller can check if all expected tasks were found
      }
    }

    return results;
  }

  /**
   * Get quick metadata about the extension
   * @returns Extension metadata
   */
  async getMetadata(): Promise<VsixMetadata> {
    const manifest = await this.readExtensionManifest();
    return {
      publisher: manifest.publisher,
      extensionId: manifest.id,
      version: manifest.version,
      name: manifest.name,
      description: manifest.description
    };
  }

  /**
   * Get information about all tasks in the extension
   * @returns Array of task information
   */
  async getTasksInfo(): Promise<TaskInfo[]> {
    const tasks = await this.readTaskManifests();
    return tasks.map(({ path, manifest }) => ({
      name: manifest.name,
      friendlyName: manifest.friendlyName,
      version: `${manifest.version.Major}.${manifest.version.Minor}.${manifest.version.Patch}`,
      path
    }));
  }

  /**
   * Close the VSIX file and clean up resources
   */
  async close(): Promise<void> {
    if (this.zipFile) {
      this.zipFile.close();
      this.zipFile = null;
    }
    this.fileCache.clear();
    this.entriesCache = null;
  }

  /**
   * Get the path to the VSIX file
   */
  getPath(): string {
    return this.vsixPath;
  }
}
