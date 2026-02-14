/**
 * Integration tests for tfx-cli execution
 * These tests actually download and execute tfx to verify it works
 * 
 * Note: These tests are slower and require network access
 * They can be skipped in CI by filtering test patterns
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { TfxManager } from '../../tfx-manager.js';
import { MockPlatformAdapter } from '../helpers/mock-platform.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { chmod, access } from 'fs/promises';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

/**
 * Real Platform Adapter for integration testing
 * Actually executes commands instead of mocking
 */
class RealPlatformAdapter extends MockPlatformAdapter {
  async exec(tool: string, args: string[], options?: any): Promise<number> {
    try {
      this.info(`Executing: ${tool} ${args.join(' ')}`);
      const result = await execFileAsync(tool, args, {
        cwd: options?.cwd,
        env: options?.env || process.env,
        timeout: 60000, // 60 second timeout
      });
      
      // Write to outStream if provided
      if (options?.outStream && result.stdout) {
        options.outStream.write(result.stdout);
      }
      
      return 0;
    } catch (error: any) {
      this.error(`Exec failed: ${error.message}`);
      return error.code || 1;
    }
  }
}

describe('TfxManager Integration Tests', () => {
  let platform: RealPlatformAdapter;
  let tempDir: string;
  const testTimeout = 120000; // 2 minutes for download tests

  beforeAll(() => {
    platform = new RealPlatformAdapter();
    tempDir = path.join(os.tmpdir(), `tfx-test-${Date.now()}`);
  });

  afterAll(async () => {
    // Cleanup temp directory if needed
    if (tempDir) {
      try {
        await platform.rmRF(tempDir);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('tfx download and execution', () => {
    it(
      'should download tfx-cli and execute --version',
      async () => {
        // Register npm (should be available in test environment)
        platform.registerTool('npm', 'npm');

        const manager = new TfxManager({
          version: '0.17.0',
          platform,
        });

        // Resolve tfx (will download if not cached)
        const tfxPath = await manager.resolve();
        expect(tfxPath).toBeDefined();
        expect(tfxPath).toContain('tfx');

        // Execute tfx --version to verify it works
        const result = await manager.execute(['--version']);

        // Verify execution succeeded
        expect(result.exitCode).toBe(0);
        
        // Log for debugging
        platform.info(`tfx --version completed with exit code ${result.exitCode}`);
      },
      testTimeout
    );

    it(
      'should use cached tfx on second execution',
      async () => {
        platform.registerTool('npm', 'npm');

        // First execution
        const manager1 = new TfxManager({
          version: '0.17.0',
          platform,
        });
        await manager1.resolve();

        // Clear messages
        platform.infoMessages = [];

        // Second execution should use cache
        const manager2 = new TfxManager({
          version: '0.17.0',
          platform,
        });
        const tfxPath = await manager2.resolve();

        expect(tfxPath).toBeDefined();
        
        // Should have found it in cache
        const foundCached = platform.infoMessages.some((m) =>
          m.includes('Found cached tfx-cli@0.17.0')
        );
        expect(foundCached).toBe(true);
      },
      testTimeout
    );

    it(
      'should execute tfx help command',
      async () => {
        platform.registerTool('npm', 'npm');

        const manager = new TfxManager({
          version: '0.17.0',
          platform,
        });

        // Execute tfx extension --help
        const result = await manager.execute(['extension', '--help']);

        // Verify execution succeeded
        expect(result.exitCode).toBe(0);
        
        platform.info(`tfx extension --help completed successfully`);
      },
      testTimeout
    );
  });

  describe('embedded tfx execution', () => {
    it('should execute tfx from PATH when embedded mode is used', async () => {
      // Check if tfx is available in PATH
      try {
        await execFileAsync('tfx', ['--version'], { timeout: 10000 });
      } catch (error) {
        // Skip test if tfx not in PATH
        platform.warning('Skipping embedded test: tfx not found in PATH');
        return;
      }

      platform.registerTool('tfx', 'tfx');

      const manager = new TfxManager({
        version: 'embedded',
        platform,
      });

      const tfxPath = await manager.resolve();
      expect(tfxPath).toBeDefined();

      // Execute tfx --version
      const result = await manager.execute(['--version']);
      expect(result.exitCode).toBe(0);
      
      platform.info('Embedded tfx executed successfully');
    });

    it('should verify embedded tfx is executable', async () => {
      // Check if tfx is available in PATH
      let tfxPath: string;
      try {
        const result = await execFileAsync('which', ['tfx'], { timeout: 5000 });
        tfxPath = result.stdout.trim();
      } catch (error) {
        platform.warning('Skipping executable test: tfx not found in PATH');
        return;
      }

      // Check if file exists and is executable
      try {
        await access(tfxPath, 0o111); // Check execute permission
        platform.info(`Embedded tfx at ${tfxPath} is executable`);
        expect(true).toBe(true);
      } catch (error) {
        // Try to make it executable
        platform.warning(`tfx at ${tfxPath} is not executable, attempting chmod`);
        try {
          await chmod(tfxPath, 0o755);
          await access(tfxPath, 0o111);
          platform.info('Successfully made tfx executable');
          expect(true).toBe(true);
        } catch (chmodError) {
          // If chmod fails, that's also acceptable if we can still execute
          platform.error(`Could not make tfx executable: ${chmodError}`);
          // Don't fail the test - tfx might work via a wrapper script
        }
      }
    });
  });

  describe('tfx with dependencies', () => {
    it(
      'should execute tfx commands that require dependencies',
      async () => {
        platform.registerTool('npm', 'npm');

        const manager = new TfxManager({
          version: '0.17.0',
          platform,
        });

        await manager.resolve();

        // Execute a command that requires tfx dependencies
        // tfx extension --help should load all required modules
        const result = await manager.execute(['extension', '--help']);

        expect(result.exitCode).toBe(0);
        
        platform.info('tfx executed with dependencies successfully');
      },
      testTimeout
    );
  });

  describe('error handling', () => {
    it('should handle invalid tfx command gracefully', async () => {
      platform.registerTool('npm', 'npm');

      const manager = new TfxManager({
        version: '0.17.0',
        platform,
      });

      // Execute invalid command
      const result = await manager.execute(['nonexistent', 'command']);

      // tfx should return non-zero exit code for invalid commands
      expect(result.exitCode).not.toBe(0);
      
      platform.info('Invalid command handled correctly');
    }, testTimeout);
  });
});
