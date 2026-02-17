import type { IPlatformAdapter } from '@extension-tasks/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getBasicAuth } from '../../auth/basic-auth.js';

describe('GitHub Actions Basic Auth', () => {
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

  it('should return correct AuthCredentials with username and token', async () => {
    const expectedUsername = 'testuser';
    const expectedToken = 'testtoken123';
    const expectedUrl = 'https://marketplace.visualstudio.com';

    const result = await getBasicAuth(expectedUsername, expectedToken, undefined, mockPlatform);

    expect(result).toEqual({
      authType: 'basic',
      serviceUrl: expectedUrl,
      username: expectedUsername,
      password: expectedToken,
    });
  });

  it('should mask token via platform.setSecret() immediately (security critical)', async () => {
    const username = 'testuser';
    const secretToken = 'my-secret-token';

    await getBasicAuth(username, secretToken, undefined, mockPlatform);

    expect(mockPlatform.setSecret).toHaveBeenCalledWith(secretToken);
    expect(mockPlatform.setSecret).toHaveBeenCalledTimes(1);
  });

  it('should throw error for missing username', async () => {
    await expect(getBasicAuth('', 'token', undefined, mockPlatform)).rejects.toThrow(
      'Username is required for basic authentication'
    );
  });

  it('should throw error for missing token', async () => {
    await expect(getBasicAuth('username', null as any, undefined, mockPlatform)).rejects.toThrow(
      'Token is required for basic authentication'
    );
  });

  it('should use authType "basic"', async () => {
    const result = await getBasicAuth('user', 'pass', undefined, mockPlatform);

    expect(result.authType).toBe('basic');
  });

  it('should use default marketplace URL as serviceUrl', async () => {
    const result = await getBasicAuth('user', 'pass', undefined, mockPlatform);

    expect(result.serviceUrl).toBe('https://marketplace.visualstudio.com');
  });

  it('should use custom serviceUrl when provided', async () => {
    const customUrl = 'https://myserver.com/tfs';
    const result = await getBasicAuth('user', 'pass', customUrl, mockPlatform);

    expect(result.serviceUrl).toBe(customUrl);
  });

  it('should call setSecret before returning (timing security test)', async () => {
    let setSecretCalled = false;
    const username = 'testuser';
    const token = 'timing-test-token';

    mockPlatform.setSecret.mockImplementation(() => {
      setSecretCalled = true;
    });

    const result = await getBasicAuth(username, token, undefined, mockPlatform);

    // setSecret should have been called before we got the result
    expect(setSecretCalled).toBe(true);
    expect(result.password).toBe(token);
  });

  it('should handle empty token and still mask it', async () => {
    const username = 'user';
    const token = '';

    const result = await getBasicAuth(username, token, undefined, mockPlatform);

    expect(result.password).toBe('');
    expect(mockPlatform.setSecret).toHaveBeenCalledWith('');
  });
});
