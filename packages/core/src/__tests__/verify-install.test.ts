import { describe, it, expect } from '@jest/globals';
import type { VerifyInstallOptions } from '../commands/verify-install.js';

describe('verifyInstall', () => {
  it('should export verifyInstall function', async () => {
    const { verifyInstall } = await import('../commands/verify-install.js');
    expect(verifyInstall).toBeDefined();
    expect(typeof verifyInstall).toBe('function');
  });

  it('should have correct option types', () => {
    const options: VerifyInstallOptions = {
      publisherId: 'test',
      extensionId: 'test',
      accounts: ['https://dev.azure.com/org'],
    };
    expect(options.publisherId).toBe('test');
    expect(options.extensionId).toBe('test');
    expect(options.accounts).toHaveLength(1);
  });

  it('should support optional timeout and polling options', () => {
    const options: VerifyInstallOptions = {
      publisherId: 'test',
      extensionId: 'test',
      accounts: ['https://dev.azure.com/org'],
      timeoutMinutes: 5,
      pollingIntervalSeconds: 30,
      expectedTaskNames: ['Task1', 'Task2'],
      extensionTag: '-dev',
    };
    expect(options.timeoutMinutes).toBe(5);
    expect(options.pollingIntervalSeconds).toBe(30);
    expect(options.expectedTaskNames).toHaveLength(2);
    expect(options.extensionTag).toBe('-dev');
  });
});

