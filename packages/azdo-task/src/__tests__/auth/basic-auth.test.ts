import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getBasicAuth } from '../../auth/basic-auth.js';
import * as tl from 'azure-pipelines-task-lib/task.js';
import type { IPlatformAdapter } from '@extension-tasks/core';

// Mock azure-pipelines-task-lib
jest.mock('azure-pipelines-task-lib/task.js');

describe('Azure Pipelines Basic Auth', () => {
  let mockPlatform: jest.Mocked<IPlatformAdapter>;
  let mockGetEndpointUrl: jest.MockedFunction<typeof tl.getEndpointUrl>;
  let mockGetEndpointAuthorizationParameter: jest.MockedFunction<
    typeof tl.getEndpointAuthorizationParameter
  >;

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

    mockGetEndpointUrl = tl.getEndpointUrl as jest.MockedFunction<typeof tl.getEndpointUrl>;
    mockGetEndpointAuthorizationParameter = tl.getEndpointAuthorizationParameter as jest.MockedFunction<
      typeof tl.getEndpointAuthorizationParameter
    >;
  });

  it('should return correct AuthCredentials with username and password', async () => {
    const connectionName = 'TestConnection';
    const expectedUrl = 'https://marketplace.visualstudio.com';
    const expectedUsername = 'testuser';
    const expectedPassword = 'testpassword123';

    mockGetEndpointUrl.mockReturnValue(expectedUrl);
    mockGetEndpointAuthorizationParameter.mockImplementation((conn, param) => {
      if (param === 'username') return expectedUsername;
      if (param === 'password') return expectedPassword;
      return '';
    });

    const result = await getBasicAuth(connectionName, mockPlatform);

    expect(result).toEqual({
      authType: 'basic',
      serviceUrl: expectedUrl,
      username: expectedUsername,
      password: expectedPassword,
    });
  });

  it('should mask password via platform.setSecret() immediately (security critical)', async () => {
    const connectionName = 'TestConnection';
    const secretPassword = 'my-secret-password';

    mockGetEndpointUrl.mockReturnValue('https://marketplace.visualstudio.com');
    mockGetEndpointAuthorizationParameter.mockImplementation((conn, param) => {
      if (param === 'username') return 'user';
      if (param === 'password') return secretPassword;
      return '';
    });

    await getBasicAuth(connectionName, mockPlatform);

    expect(mockPlatform.setSecret).toHaveBeenCalledWith(secretPassword);
    expect(mockPlatform.setSecret).toHaveBeenCalledTimes(1);
  });

  it('should retrieve username with correct parameter', async () => {
    const connectionName = 'TestConnection';
    mockGetEndpointUrl.mockReturnValue('https://marketplace.visualstudio.com');
    mockGetEndpointAuthorizationParameter.mockReturnValue('value');

    await getBasicAuth(connectionName, mockPlatform);

    expect(mockGetEndpointAuthorizationParameter).toHaveBeenCalledWith(
      connectionName,
      'username',
      false
    );
  });

  it('should retrieve password with correct parameter', async () => {
    const connectionName = 'TestConnection';
    mockGetEndpointUrl.mockReturnValue('https://marketplace.visualstudio.com');
    mockGetEndpointAuthorizationParameter.mockReturnValue('value');

    await getBasicAuth(connectionName, mockPlatform);

    expect(mockGetEndpointAuthorizationParameter).toHaveBeenCalledWith(
      connectionName,
      'password',
      false
    );
  });

  it('should use authType "basic"', async () => {
    mockGetEndpointUrl.mockReturnValue('https://marketplace.visualstudio.com');
    mockGetEndpointAuthorizationParameter.mockReturnValue('value');

    const result = await getBasicAuth('TestConnection', mockPlatform);

    expect(result.authType).toBe('basic');
  });

  it('should handle empty password and still mask it', async () => {
    const connectionName = 'TestConnection';
    mockGetEndpointUrl.mockReturnValue('https://marketplace.visualstudio.com');
    mockGetEndpointAuthorizationParameter.mockImplementation((conn, param) => {
      if (param === 'username') return 'user';
      if (param === 'password') return '';
      return '';
    });

    const result = await getBasicAuth(connectionName, mockPlatform);

    expect(result.password).toBe('');
    expect(mockPlatform.setSecret).toHaveBeenCalledWith('');
  });
});
