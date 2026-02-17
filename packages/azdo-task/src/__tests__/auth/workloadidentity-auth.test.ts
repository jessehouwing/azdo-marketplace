import type { IPlatformAdapter } from '@extension-tasks/core';
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const artifactsCommonMock = {
  getFederatedWorkloadIdentityCredentials:
    jest.fn<(connectionName: string) => Promise<string | undefined>>(),
};

jest.unstable_mockModule(
  'azure-pipelines-tasks-artifacts-common/EntraWifUserServiceConnectionUtils',
  () => artifactsCommonMock
);

let getWorkloadIdentityAuth: (
  connectionName: string,
  platform: IPlatformAdapter
) => Promise<{ authType: string; serviceUrl: string; token?: string }>;

describe('Azure Pipelines Workload Identity Auth', () => {
  let mockPlatform: jest.Mocked<IPlatformAdapter>;

  beforeAll(async () => {
    ({ getWorkloadIdentityAuth } = await import('../../auth/workloadidentity-auth.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlatform = {
      getInput: jest.fn(),
      getBoolInput: jest.fn(),
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
      findMatch: jest.fn(),
      fileExists: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      mkdirP: jest.fn(),
      rmRF: jest.fn(),
      getTempDir: jest.fn(),
      cacheDir: jest.fn(),
      findCachedTool: jest.fn(),
      downloadTool: jest.fn(),
      setResult: jest.fn(),
    } as unknown as jest.Mocked<IPlatformAdapter>;
  });

  it('returns token from endpoint authorization parameter', async () => {
    artifactsCommonMock.getFederatedWorkloadIdentityCredentials.mockResolvedValue('wif-token');

    const result = await getWorkloadIdentityAuth('WifConnection', mockPlatform);

    expect(artifactsCommonMock.getFederatedWorkloadIdentityCredentials).toHaveBeenCalledWith(
      'WifConnection'
    );
    expect(result).toEqual({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'wif-token',
    });
    expect(mockPlatform.setSecret).toHaveBeenCalledWith('wif-token');
  });

  it('throws when token cannot be resolved', async () => {
    artifactsCommonMock.getFederatedWorkloadIdentityCredentials.mockResolvedValue(undefined);

    await expect(getWorkloadIdentityAuth('WifConnection', mockPlatform)).rejects.toThrow(
      "Failed to get service connection auth for workload identity service connection 'WifConnection'"
    );
  });

  it('throws when helper fails', async () => {
    artifactsCommonMock.getFederatedWorkloadIdentityCredentials.mockRejectedValue(
      new Error('helper failure')
    );

    await expect(getWorkloadIdentityAuth('WifConnection', mockPlatform)).rejects.toThrow(
      'helper failure'
    );
  });
});
