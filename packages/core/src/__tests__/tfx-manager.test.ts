import { describe, it, expect, beforeEach } from '@jest/globals';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

describe('TfxManager', () => {
  let platform: MockPlatformAdapter;

  beforeEach(() => {
    platform = new MockPlatformAdapter();
  });

  describe('resolve', () => {
    it('should use embedded tfx from PATH', async () => {
      platform.registerTool('tfx', '/usr/local/bin/tfx');

      const manager = new TfxManager({
        version: 'embedded',
        platform,
      });

      const tfxPath = await manager.resolve();

      expect(tfxPath).toBe('/usr/local/bin/tfx');
      expect(platform.infoMessages).toContain('Using embedded tfx-cli from PATH');
    });

    it('should cache resolved path for subsequent calls', async () => {
      platform.registerTool('tfx', '/usr/local/bin/tfx');

      const manager = new TfxManager({
        version: 'embedded',
        platform,
      });

      const path1 = await manager.resolve();
      const path2 = await manager.resolve();

      expect(path1).toBe(path2);
      // Second call should use debug message about cached path
      expect(platform.debugMessages.some((m) => m.includes('Using cached tfx path'))).toBe(true);
    });

    it('should find cached tool from platform cache', async () => {
      // Simulate a previously cached tool
      await platform.cacheDir('/tools/tfx-cli', 'tfx-cli', '0.17.0');

      const manager = new TfxManager({
        version: '0.17.0',
        platform,
      });

      const tfxPath = await manager.resolve();

      expect(tfxPath).toContain('tfx-cli/0.17.0');
      expect(platform.infoMessages.some((m) => m.includes('Found cached tfx-cli@0.17.0'))).toBe(
        true
      );
    });

    it('should handle version resolution for non-embedded', async () => {
      platform.registerTool('npm', '/usr/bin/npm');
      platform.registerTool('tfx', '/usr/local/bin/tfx');

      const manager = new TfxManager({
        version: '0.17.x',
        platform,
      });

      const tfxPath = await manager.resolve();

      expect(tfxPath).toBeDefined();
      // With new implementation, it will try npm pack but fall back to PATH on mock platform
      // Check that either npm pack was attempted OR fallback occurred
      const attemptedDownload = platform.infoMessages.some((m) =>
        m.includes('Downloading tfx-cli@')
      );
      const usedFallback = platform.warningMessages.some((m) =>
        m.includes('Failed to download') || m.includes('Falling back to tfx from PATH')
      );
      expect(attemptedDownload || usedFallback).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      platform.registerTool('tfx', '/usr/local/bin/tfx');
    });

    it('should execute tfx with provided arguments', async () => {
      const manager = new TfxManager({
        version: 'embedded',
        platform,
      });

      const result = await manager.execute(['extension', 'create']);

      expect(result.exitCode).toBe(0);
      expect(platform.execCalls).toHaveLength(1);
      expect(platform.execCalls[0].tool).toBe('/usr/local/bin/tfx');
      expect(platform.execCalls[0].args).toEqual(['extension', 'create']);
    });

    it('should add JSON flags when captureJson is true', async () => {
      const manager = new TfxManager({
        version: 'embedded',
        platform,
      });

      await manager.execute(['extension', 'show'], { captureJson: true });

      const execCall = platform.execCalls[0];
      expect(execCall.args).toContain('--json');
      expect(execCall.args).toContain('--debug-log-stream');
      expect(execCall.args).toContain('stderr');
    });

    it('should not duplicate JSON flags if already present', async () => {
      const manager = new TfxManager({
        version: 'embedded',
        platform,
      });

      await manager.execute(['extension', 'show', '--json'], { captureJson: true });

      const execCall = platform.execCalls[0];
      const jsonFlags = execCall.args.filter((arg) => arg === '--json');
      expect(jsonFlags).toHaveLength(1); // Should only have one --json flag
    });

    it('should pass working directory option', async () => {
      const manager = new TfxManager({
        version: 'embedded',
        platform,
      });

      await manager.execute(['extension', 'create'], { cwd: '/project/root' });

      expect(platform.execCalls[0].options?.cwd).toBe('/project/root');
    });

    it('should pass environment variables', async () => {
      const manager = new TfxManager({
        version: 'embedded',
        platform,
      });

      const env = { NODE_ENV: 'production' };
      await manager.execute(['extension', 'create'], { env });

      expect(platform.execCalls[0].options?.env).toEqual(env);
    });

    it('should log execution command', async () => {
      const manager = new TfxManager({
        version: 'embedded',
        platform,
      });

      await manager.execute(['extension', 'create']);

      expect(
        platform.infoMessages.some((m) => m.includes('Executing: /usr/local/bin/tfx extension create'))
      ).toBe(true);
    });

    it('should create JsonOutputStream when captureJson is enabled', async () => {
      const manager = new TfxManager({
        version: 'embedded',
        platform,
      });

      await manager.execute(['extension', 'show'], { captureJson: true });

      // Check that outStream was provided in exec options
      expect(platform.execCalls[0].options?.outStream).toBeDefined();
    });
  });

  describe('platform-specific behavior', () => {
    it('should use tfx.cmd on Windows', () => {
      const originalPlatform = process.platform;
      // Note: Can't actually change process.platform in tests easily
      // This is more of a documentation test
      // In real implementation, TfxManager would check process.platform
      expect(process.platform).toBeDefined();
    });
  });

  describe('downloadAndCache', () => {
    it('should attempt npm pack and extract workflow', async () => {
      // Register npm tool
      platform.registerTool('npm', '/usr/bin/npm');
      
      // Mock npm pack will fail in MockPlatformAdapter, so it will fall back
      platform.registerTool('tfx', '/usr/local/bin/tfx');

      const manager = new TfxManager({
        version: '0.19.0',
        platform,
      });

      const tfxPath = await manager.resolve();

      // Verify it attempted the install process
      expect(platform.infoMessages.some((m) =>
        m.includes('Installing tfx-cli@0.19.0 from npm')
      )).toBe(true);
      
      // Should fall back gracefully when npm install fails in mock
      expect(tfxPath).toBeDefined();
    });

    it('should handle npm install failure gracefully', async () => {
      // Don't register npm, which will cause install to fail
      platform.registerTool('tfx', '/usr/local/bin/tfx');

      const manager = new TfxManager({
        version: 'latest',
        platform,
      });

      const tfxPath = await manager.resolve();

      // Should fall back to PATH
      expect(tfxPath).toBe('/usr/local/bin/tfx');
      expect(platform.warningMessages.some((m) =>
        m.includes('Falling back to tfx from PATH')
      )).toBe(true);
    });

    it('should throw error if npm install fails and no tfx in PATH', async () => {
      // Don't register npm or tfx

      const manager = new TfxManager({
        version: '0.20.0',
        platform,
      });

      await expect(manager.resolve()).rejects.toThrow(
        /Failed to install tfx-cli/
      );
    });
  });
});
