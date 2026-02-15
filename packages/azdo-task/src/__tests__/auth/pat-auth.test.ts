import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getPatAuth } from '../../auth/pat-auth.js';
import * as tl from 'azure-pipelines-task-lib/task.js';
import type { IPlatformAdapter } from '@extension-tasks/core';

// Mock azure-pipelines-task-lib
jest.mock('azure-pipelines-task-lib/task.js');

describe('Azure Pipelines PAT Auth', () => {
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

  it('should return correct AuthCredentials structure', async () => {
    const connectionName = 'TestConnection';
    const expectedUrl = 'https://marketplace.visualstudio.com';
    const expectedToken = 'test-pat-token-12345';

    mockGetEndpointUrl.mockReturnValue(expectedUrl);
    mockGetEndpointAuthorizationParameter.mockReturnValue(expectedToken);

    const result = await getPatAuth(connectionName, mockPlatform);

    expect(result).toEqual({
      authType: 'pat',
      serviceUrl: expectedUrl,
      token: expectedToken,
    });
  });

  it('should mask PAT via platform.setSecret() immediately (security critical)', async () => {
    const connectionName = 'TestConnection';
    const secretToken = 'secret-pat-token-67890';

    mockGetEndpointUrl.mockReturnValue('https://marketplace.visualstudio.com');
    mockGetEndpointAuthorizationParameter.mockReturnValue(secretToken);

    await getPatAuth(connectionName, mockPlatform);

    expect(mockPlatform.setSecret).toHaveBeenCalledWith(secretToken);
    expect(mockPlatform.setSecret).toHaveBeenCalledTimes(1);
  });

  it('should call getEndpointUrl with correct connection name', async () => {
    const connectionName = 'MyConnection';
    mockGetEndpointUrl.mockReturnValue('https://marketplace.visualstudio.com');
    mockGetEndpointAuthorizationParameter.mockReturnValue('token');

    await getPatAuth(connectionName, mockPlatform);

    expect(mockGetEndpointUrl).toHaveBeenCalledWith(connectionName, false);
  });

  it('should call getEndpointAuthorizationParameter with correct parameters', async () => {
    const connectionName = 'TestConnection';
    mockGetEndpointUrl.mockReturnValue('https://marketplace.visualstudio.com');
    mockGetEndpointAuthorizationParameter.mockReturnValue('token');

    await getPatAuth(connectionName, mockPlatform);

    expect(mockGetEndpointAuthorizationParameter).toHaveBeenCalledWith(
      connectionName,
      'apitoken',
      false
    );
  });

  it('should handle empty token and still mask it', async () => {
    const connectionName = 'TestConnection';
    mockGetEndpointUrl.mockReturnValue('https://marketplace.visualstudio.com');
    mockGetEndpointAuthorizationParameter.mockReturnValue('');

    const result = await getPatAuth(connectionName, mockPlatform);

    expect(result.token).toBe('');
    expect(mockPlatform.setSecret).toHaveBeenCalledWith('');
  });

  it('should use authType "pat"', async () => {
    mockGetEndpointUrl.mockReturnValue('https://marketplace.visualstudio.com');
    mockGetEndpointAuthorizationParameter.mockReturnValue('token');

    const result = await getPatAuth('TestConnection', mockPlatform);

    expect(result.authType).toBe('pat');
  });
});
