import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getPatAuth } from '../../auth/pat-auth.js';
import type { IPlatformAdapter } from '@extension-tasks/core';

describe('GitHub Actions PAT Auth', () => {
  let mockPlatform: jest.Mocked<IPlatformAdapter>;

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
  });

  it('should return correct AuthCredentials structure', async () => {
    const expectedToken = 'github-pat-token-12345';

    const result = await getPatAuth(expectedToken, mockPlatform);

    expect(result).toEqual({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: expectedToken,
    });
  });

  it('should mask token via platform.setSecret() immediately (security critical)', async () => {
    const secretToken = 'secret-github-pat-67890';

    await getPatAuth(secretToken, mockPlatform);

    expect(mockPlatform.setSecret).toHaveBeenCalledWith(secretToken);
    expect(mockPlatform.setSecret).toHaveBeenCalledTimes(1);
  });

  it('should throw error for missing token', async () => {
    await expect(getPatAuth('', mockPlatform)).rejects.toThrow('PAT token is required');
  });

  it('should use authType "pat"', async () => {
    const result = await getPatAuth('test-token', mockPlatform);

    expect(result.authType).toBe('pat');
  });

  it('should use marketplace URL as serviceUrl', async () => {
    const result = await getPatAuth('test-token', mockPlatform);

    expect(result.serviceUrl).toBe('https://marketplace.visualstudio.com');
  });

  it('should call setSecret before returning (timing security test)', async () => {
    let setSecretCalled = false;
    const token = 'timing-test-token';
    
    mockPlatform.setSecret.mockImplementation(() => {
      setSecretCalled = true;
    });

    const result = await getPatAuth(token, mockPlatform);

    // setSecret should have been called before we got the result
    expect(setSecretCalled).toBe(true);
    expect(result.token).toBe(token);
  });
});
