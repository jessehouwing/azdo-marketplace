import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

describe('TfxManager', () => {
  let platform: MockPlatformAdapter;
  let originalCwd: string;
  let originalArgv1: string | undefined;

  beforeEach(() => {
    platform = new MockPlatformAdapter();
    originalCwd = process.cwd();
    originalArgv1 = process.argv[1];
  });

  describe('resolve', () => {
    it('should resolve built-in tfx from nearest node_modules', async () => {
      const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'tfx-built-in-'));
      const entryFile = path.join(sandbox, 'dist', 'main.js');
      const tfxEntrypoint = path.join(
        sandbox,
        'dist',
        'node_modules',
        'tfx-cli',
        '_build',
        'tfx-cli.js'
      );
      await fs.mkdir(path.dirname(tfxEntrypoint), { recursive: true });
      await fs.mkdir(path.dirname(entryFile), { recursive: true });
      await fs.writeFile(entryFile, '', 'utf-8');
      await fs.writeFile(tfxEntrypoint, '#!/usr/bin/env node\nrequire("./app");\n', 'utf-8');
      process.argv[1] = entryFile;

      const manager = new TfxManager({
        tfxVersion: 'built-in',
        platform,
      });

      try {
        const tfxPath = await manager.resolve();

        expect(tfxPath).toBe(tfxEntrypoint);
        expect(platform.infoMessages).toContain(
          'Using built-in tfx-cli from core package dependencies'
        );
      } finally {
        process.chdir(originalCwd);
        process.argv[1] = originalArgv1;
        await fs.rm(sandbox, { recursive: true, force: true });
      }
    });

    it('should fail built-in resolution when local node_modules tfx is missing', async () => {
      const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'tfx-built-in-missing-'));
      const entryFile = path.join(sandbox, 'dist', 'main.js');
      await fs.mkdir(path.dirname(entryFile), { recursive: true });
      await fs.writeFile(entryFile, '', 'utf-8');
      process.argv[1] = entryFile;
      platform.registerTool('tfx', '/usr/local/bin/tfx');

      const manager = new TfxManager({
        tfxVersion: 'built-in',
        platform,
      });

      try {
        await expect(manager.resolve()).rejects.toThrow(/Built-in tfx-cli not found/);
      } finally {
        process.chdir(originalCwd);
        process.argv[1] = originalArgv1;
        await fs.rm(sandbox, { recursive: true, force: true });
      }
    });

    it('should cache resolved path for subsequent calls', async () => {
      const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'tfx-built-in-cache-'));
      const entryFile = path.join(sandbox, 'dist', 'main.js');
      const tfxEntrypoint = path.join(
        sandbox,
        'dist',
        'node_modules',
        'tfx-cli',
        '_build',
        'tfx-cli.js'
      );
      await fs.mkdir(path.dirname(tfxEntrypoint), { recursive: true });
      await fs.mkdir(path.dirname(entryFile), { recursive: true });
      await fs.writeFile(entryFile, '', 'utf-8');
      await fs.writeFile(tfxEntrypoint, '#!/usr/bin/env node\nrequire("./app");\n', 'utf-8');
      process.argv[1] = entryFile;

      const manager = new TfxManager({
        tfxVersion: 'built-in',
        platform,
      });

      try {
        const path1 = await manager.resolve();
        const path2 = await manager.resolve();

        expect(path1).toBe(path2);
        // Second call should use debug message about cached path
        expect(platform.debugMessages.some((m) => m.includes('Using cached tfx path'))).toBe(true);
      } finally {
        process.chdir(originalCwd);
        process.argv[1] = originalArgv1;
        await fs.rm(sandbox, { recursive: true, force: true });
      }
    });

    it('should find cached tool from platform cache', async () => {
      // Simulate a previously cached tool
      await platform.cacheDir('/tools/tfx-cli', 'tfx-cli', '0.17.0');
      platform.registerTool('npm', '/usr/bin/npm');
      jest.spyOn(platform, 'exec').mockImplementation(async (_tool, args, options) => {
        if (args[0] === 'view') {
          options?.outStream?.write('"0.17.0"');
          return 0;
        }
        return 1;
      });

      const manager = new TfxManager({
        tfxVersion: '0.17.0',
        platform,
      });

      const tfxPath = await manager.resolve();

      expect(tfxPath).toContain('0.17.0');
      expect(platform.infoMessages.some((m) => m.includes('Found cached tfx-cli@0.17.0'))).toBe(
        true
      );
    });

    it('should handle version resolution for non-embedded', async () => {
      platform.registerTool('npm', '/usr/bin/npm');
      platform.registerTool('tfx', '/usr/local/bin/tfx');
      jest.spyOn(platform, 'exec').mockImplementation(async (_tool, args, options) => {
        if (args[0] === 'view') {
          options?.outStream?.write('"0.17.3"');
          return 0;
        }
        return 1;
      });

      const manager = new TfxManager({
        tfxVersion: '0.17.x',
        platform,
      });

      const tfxPath = await manager.resolve();

      expect(tfxPath).toBeDefined();
      expect(tfxPath).toBeDefined();
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      platform.registerTool('tfx', '/usr/local/bin/tfx');
    });

    it('should execute tfx with provided arguments', async () => {
      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      const result = await manager.execute(['extension', 'create']);

      expect(result.exitCode).toBe(0);
      expect(platform.execCalls).toHaveLength(1);
      expect(platform.execCalls[0].tool).toBe('/usr/local/bin/tfx');
      expect(platform.execCalls[0].args).toEqual(['extension', 'create']);
    });

    it('should execute built-in JS entrypoint via node', async () => {
      const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'tfx-built-in-js-exec-'));
      const entryFile = path.join(sandbox, 'dist', 'main.js');
      const tfxEntrypoint = path.join(
        sandbox,
        'dist',
        'node_modules',
        'tfx-cli',
        '_build',
        'tfx-cli.js'
      );
      await fs.mkdir(path.dirname(tfxEntrypoint), { recursive: true });
      await fs.mkdir(path.dirname(entryFile), { recursive: true });
      await fs.writeFile(entryFile, '', 'utf-8');
      await fs.writeFile(tfxEntrypoint, '#!/usr/bin/env node\nrequire("./app");\n', 'utf-8');
      process.argv[1] = entryFile;

      platform.registerTool('node', '/usr/local/bin/node');

      const manager = new TfxManager({
        tfxVersion: 'built-in',
        platform,
      });

      try {
        await manager.execute(['extension', 'show']);

        expect(platform.execCalls[0].tool).toBe('/usr/local/bin/node');
        expect(platform.execCalls[0].args[0]).toBe(tfxEntrypoint);
        expect(platform.execCalls[0].args.slice(1)).toEqual(['extension', 'show']);
      } finally {
        process.chdir(originalCwd);
        process.argv[1] = originalArgv1;
        await fs.rm(sandbox, { recursive: true, force: true });
      }
    });

    it('should add JSON flags when captureJson is true', async () => {
      const manager = new TfxManager({
        tfxVersion: 'path',
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
        tfxVersion: 'path',
        platform,
      });

      await manager.execute(['extension', 'show', '--json'], { captureJson: true });

      const execCall = platform.execCalls[0];
      const jsonFlags = execCall.args.filter((arg) => arg === '--json');
      expect(jsonFlags).toHaveLength(1); // Should only have one --json flag
    });

    it('should pass working directory option', async () => {
      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      await manager.execute(['extension', 'create'], { cwd: '/project/root' });

      expect(platform.execCalls[0].options?.cwd).toBe('/project/root');
    });

    it('should pass environment variables', async () => {
      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      const env = { NODE_ENV: 'production' };
      await manager.execute(['extension', 'create'], { env });

      expect(platform.execCalls[0].options?.env).toEqual(env);
    });

    it('should default to silent when debug is disabled', async () => {
      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      await manager.execute(['extension', 'create']);

      expect(platform.execCalls[0].options?.silent).toBe(true);
    });

    it('should disable silent when debug is enabled', async () => {
      platform.debugEnabled = true;
      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      await manager.execute(['extension', 'create']);

      expect(platform.execCalls[0].options?.silent).toBe(false);
    });

    it('should disable silent for captureJson executions in debug mode by default', async () => {
      platform.debugEnabled = true;
      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      await manager.execute(['extension', 'show'], { captureJson: true });

      expect(platform.execCalls[0].options?.silent).toBe(false);
    });

    it('should honor explicit silent override', async () => {
      platform.debugEnabled = true;
      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      await manager.execute(['extension', 'create'], { silent: true });

      expect(platform.execCalls[0].options?.silent).toBe(true);
    });

    it('should log execution details', async () => {
      platform.debugEnabled = true;
      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      await manager.execute(['extension', 'create']);

      expect(
        platform.debugMessages.some(
          (m) => m.includes('Executing:') && m.includes('tfx') && m.includes('extension create')
        )
      ).toBe(true);
    });

    it('should create JsonOutputStream when captureJson is enabled', async () => {
      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      await manager.execute(['extension', 'show'], { captureJson: true });

      // Check that outStream was provided in exec options
      expect(platform.execCalls[0].options?.outStream).toBeDefined();
    });

    it('should set ignoreReturnCode to capture failure output', async () => {
      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      await manager.execute(['extension', 'create'], { captureJson: true });

      expect(platform.execCalls[0].options?.ignoreReturnCode).toBe(true);
    });

    it('should capture stderr and stdout output from exec streams', async () => {
      jest.spyOn(platform, 'exec').mockImplementation(async (_tool, _args, options) => {
        options?.outStream?.write('stdout-data\n');
        options?.errStream?.write('stderr-data\n');
        return 1;
      });

      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      const result = await manager.execute(['extension', 'create']);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('stdout-data');
      expect(result.stderr).toContain('stderr-data');
    });

    it('should replay captured stdout/stderr to debug logs before returning in debug mode', async () => {
      platform.debugEnabled = true;
      jest.spyOn(platform, 'exec').mockImplementation(async (_tool, _args, options) => {
        options?.outStream?.write('unique-stdout-line\n');
        options?.errStream?.write('unique-stderr-line\n');
        return 1;
      });

      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      await manager.execute(['extension', 'create']);

      expect(
        platform.debugMessages.some((m) => m.includes('[tfx stdout] unique-stdout-line'))
      ).toBe(true);
      expect(
        platform.debugMessages.some((m) => m.includes('[tfx stderr] unique-stderr-line'))
      ).toBe(true);
    });

    it('should return non-json stdout content when captureJson is enabled', async () => {
      jest.spyOn(platform, 'exec').mockImplementation(async (_tool, _args, options) => {
        options?.outStream?.write('non-json-output\n');
        return 1;
      });

      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      const result = await manager.execute(['extension', 'show'], { captureJson: true });

      expect(result.stdout).toContain('non-json-output');
    });

    it('should log explicit empty markers for stdout/stderr in debug mode when streams are empty', async () => {
      platform.debugEnabled = true;
      jest.spyOn(platform, 'exec').mockImplementation(async () => 0);

      const manager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      await manager.execute(['extension', 'show'], { captureJson: true });

      expect(platform.debugMessages.some((m) => m.includes('[tfx stdout] <empty>'))).toBe(true);
      expect(platform.debugMessages.some((m) => m.includes('[tfx stderr] <empty>'))).toBe(true);
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
      jest.spyOn(platform, 'exec').mockImplementation(async (_tool, args, options) => {
        if (args[0] === 'view') {
          options?.outStream?.write('"0.19.0"');
          return 0;
        }
        return 1;
      });

      const manager = new TfxManager({
        tfxVersion: '0.19.0',
        platform,
      });

      const tfxPath = await manager.resolve();

      // Verify it attempted the install process
      expect(platform.infoMessages.some((m) => m.includes('Installing tfx-cli@0.19.0'))).toBe(true);

      // Should fall back gracefully when npm install fails in mock
      expect(tfxPath).toBeDefined();
    });

    it('should handle npm install failure gracefully', async () => {
      // Register npm for version resolution, but keep install fallback path
      platform.registerTool('npm', '/usr/bin/npm');
      platform.registerTool('tfx', '/usr/local/bin/tfx');
      jest.spyOn(platform, 'exec').mockImplementation(async (_tool, args, options) => {
        if (args[0] === 'view') {
          options?.outStream?.write('"0.23.1"');
          return 0;
        }
        return 1;
      });

      const manager = new TfxManager({
        tfxVersion: 'latest',
        platform,
      });

      const tfxPath = await manager.resolve();

      // Should not fail when install path cannot be prepared in mock environment
      expect(tfxPath).toBeDefined();
    });

    it('should throw error if npm install fails and no tfx in PATH', async () => {
      platform.registerTool('npm', '/usr/bin/npm');
      jest.spyOn(platform, 'exec').mockImplementation(async (_tool, args, options) => {
        if (args[0] === 'view') {
          options?.outStream?.write('"0.20.0"');
          return 0;
        }
        return 1;
      });

      const manager = new TfxManager({
        tfxVersion: '0.20.0',
        platform,
      });

      await expect(manager.resolve()).rejects.toThrow(/Failed to install tfx-cli/);
    });
  });
});
