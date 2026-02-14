import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getOidcAuth } from '../../auth/oidc-auth.js';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import type { IPlatformAdapter } from '@extension-tasks/core';

// Mock @actions modules
jest.mock('@actions/core');
jest.mock('@actions/exec');

describe('GitHub OIDC Auth', () => {
  let mockPlatform: jest.Mocked<IPlatformAdapter>;
  let mockCoreInfo: jest.MockedFunction<typeof core.info>;
  let mockCoreSetSecret: jest.MockedFunction<typeof core.setSecret>;
  let mockExecExec: jest.MockedFunction<typeof exec.exec>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlatform = {
      getInput: jest.fn(),
      getBoolInput: jest.fn(),
      getPathInput: jest.fn(),
      getDelimitedInput: jest.fn(),
      setSecret: jest.fn(),
      setVariable: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      exec: jest.fn(),
      which: jest.fn(),
      getVariable: jest.fn(),
      setOutput: jest.fn(),
    } as unknown as jest.Mocked<IPlatformAdapter>;

    mockCoreInfo = core.info as jest.MockedFunction<typeof core.info>;
    mockCoreSetSecret = core.setSecret as jest.MockedFunction<typeof core.setSecret>;
    mockExecExec = exec.exec as jest.MockedFunction<typeof exec.exec>;
  });

  it('should return correct AuthCredentials structure', async () => {
    const expectedToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6...';
    
    mockExecExec.mockImplementation(async (_command, _args, options) => {
      if (options?.listeners?.stdout) {
        const output = JSON.stringify({ accessToken: expectedToken });
        options.listeners.stdout(Buffer.from(output));
      }
      return 0;
    });

    const result = await getOidcAuth(undefined, mockPlatform);

    expect(result).toEqual({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: expectedToken,
    });
  });

  it('should mask token immediately with both core and platform', async () => {
    const expectedToken = 'test-azure-ad-token';
    
    mockExecExec.mockImplementation(async (_command, _args, options) => {
      if (options?.listeners?.stdout) {
        const output = JSON.stringify({ accessToken: expectedToken });
        options.listeners.stdout(Buffer.from(output));
      }
      return 0;
    });

    await getOidcAuth(undefined, mockPlatform);

    expect(mockCoreSetSecret).toHaveBeenCalledWith(expectedToken);
    expect(mockPlatform.setSecret).toHaveBeenCalledWith(expectedToken);
  });

  it('should execute Azure CLI with correct arguments for default resource', async () => {
    const expectedToken = 'test-token';
    
    mockExecExec.mockImplementation(async (_command, _args, options) => {
      if (options?.listeners?.stdout) {
        const output = JSON.stringify({ accessToken: expectedToken });
        options.listeners.stdout(Buffer.from(output));
      }
      return 0;
    });

    await getOidcAuth(undefined, mockPlatform);

    expect(mockExecExec).toHaveBeenCalledWith(
      'az',
      ['account', 'get-access-token', '--resource', 'https://marketplace.visualstudio.com', '--output', 'json'],
      expect.objectContaining({ silent: true })
    );
  });

  it('should use custom resource when provided', async () => {
    const expectedToken = 'test-token';
    const customResource = 'https://custom.resource.com';
    
    mockExecExec.mockImplementation(async (_command, _args, options) => {
      if (options?.listeners?.stdout) {
        const output = JSON.stringify({ accessToken: expectedToken });
        options.listeners.stdout(Buffer.from(output));
      }
      return 0;
    });

    await getOidcAuth(customResource, mockPlatform);

    expect(mockExecExec).toHaveBeenCalledWith(
      'az',
      ['account', 'get-access-token', '--resource', customResource, '--output', 'json'],
      expect.any(Object)
    );
  });

  it('should throw error when Azure CLI exits with non-zero code', async () => {
    mockExecExec.mockImplementation(async (_command, _args, options) => {
      if (options?.listeners?.stderr) {
        options.listeners.stderr(Buffer.from('Azure CLI error: not logged in'));
      }
      return 1;
    });

    await expect(getOidcAuth(undefined, mockPlatform))
      .rejects.toThrow('Azure CLI exited with code 1');
  });

  it('should throw error when token is missing from response', async () => {
    mockExecExec.mockImplementation(async (_command, _args, options) => {
      if (options?.listeners?.stdout) {
        const output = JSON.stringify({ someOtherField: 'value' });
        options.listeners.stdout(Buffer.from(output));
      }
      return 0;
    });

    await expect(getOidcAuth(undefined, mockPlatform))
      .rejects.toThrow('No accessToken in Azure CLI response');
  });

  it('should throw error with helpful message when JSON parsing fails', async () => {
    mockExecExec.mockImplementation(async (_command, _args, options) => {
      if (options?.listeners?.stdout) {
        options.listeners.stdout(Buffer.from('invalid json'));
      }
      return 0;
    });

    await expect(getOidcAuth(undefined, mockPlatform))
      .rejects.toThrow('Failed to get Azure AD token via Azure CLI');
  });

  it('should log success message after obtaining token', async () => {
    const expectedToken = 'test-token';
    
    mockExecExec.mockImplementation(async (_command, _args, options) => {
      if (options?.listeners?.stdout) {
        const output = JSON.stringify({ accessToken: expectedToken });
        options.listeners.stdout(Buffer.from(output));
      }
      return 0;
    });

    await getOidcAuth(undefined, mockPlatform);

    expect(mockCoreInfo).toHaveBeenCalledWith(
      'Getting Azure AD token via Azure CLI (requires azure/login action)...'
    );
    expect(mockCoreInfo).toHaveBeenCalledWith(
      'Successfully obtained Azure AD token via Azure CLI'
    );
  });
});
