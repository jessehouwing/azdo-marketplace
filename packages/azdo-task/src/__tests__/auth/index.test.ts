import type { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const getPatAuthMock =
  jest.fn<(connectionName: string, platform: IPlatformAdapter) => Promise<AuthCredentials>>();
const getAzureRmAuthMock =
  jest.fn<(connectionName: string, platform: IPlatformAdapter) => Promise<AuthCredentials>>();
const getBasicAuthMock =
  jest.fn<(connectionName: string, platform: IPlatformAdapter) => Promise<AuthCredentials>>();
const getWorkloadIdentityAuthMock =
  jest.fn<(connectionName: string, platform: IPlatformAdapter) => Promise<AuthCredentials>>();

jest.unstable_mockModule('../../auth/pat-auth.js', () => ({
  getPatAuth: getPatAuthMock,
}));

jest.unstable_mockModule('../../auth/azurerm-auth.js', () => ({
  getAzureRmAuth: getAzureRmAuthMock,
}));

jest.unstable_mockModule('../../auth/basic-auth.js', () => ({
  getBasicAuth: getBasicAuthMock,
}));

jest.unstable_mockModule('../../auth/workloadidentity-auth.js', () => ({
  getWorkloadIdentityAuth: getWorkloadIdentityAuthMock,
}));

let getAuth: (typeof import('../../auth/index.js'))['getAuth'];

describe('Azure Pipelines getAuth router', () => {
  const platform = {} as IPlatformAdapter;

  beforeAll(async () => {
    ({ getAuth } = await import('../../auth/index.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes PAT connections to PAT auth', async () => {
    getPatAuthMock.mockResolvedValue({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'pat-token',
    });

    const result = await getAuth('PAT', 'MyConn', platform);

    expect(getPatAuthMock).toHaveBeenCalledWith('MyConn', platform);
    expect(result.authType).toBe('pat');
  });

  it('routes AzureRM connections to AzureRM auth', async () => {
    getAzureRmAuthMock.mockResolvedValue({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'aad-token',
    });

    const result = await getAuth('AzureRM', 'ArmConn', platform);

    expect(getAzureRmAuthMock).toHaveBeenCalledWith('ArmConn', platform);
    expect(result.token).toBe('aad-token');
  });

  it('routes WorkloadIdentity connections to workload identity auth', async () => {
    getWorkloadIdentityAuthMock.mockResolvedValue({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'wif-token',
    });

    const result = await getAuth('WorkloadIdentity', 'WifConn', platform);

    expect(getWorkloadIdentityAuthMock).toHaveBeenCalledWith('WifConn', platform);
    expect(result.token).toBe('wif-token');
  });

  it('routes Basic connections to Basic auth', async () => {
    getBasicAuthMock.mockResolvedValue({
      authType: 'basic',
      serviceUrl: 'https://marketplace.visualstudio.com',
      username: 'user',
      password: 'pass',
    });

    const result = await getAuth('Basic', 'GenericConn', platform);

    expect(getBasicAuthMock).toHaveBeenCalledWith('GenericConn', platform);
    expect(result.authType).toBe('basic');
  });

  it('throws on unsupported connection type', async () => {
    await expect(getAuth('unsupported:type' as any, 'BadConn', platform)).rejects.toThrow(
      'Unsupported connection type: unsupported:type. Expected one of: PAT, WorkloadIdentity, AzureRM, Basic'
    );
  });

  it('normalizes connection type values case-insensitively', async () => {
    getPatAuthMock.mockResolvedValue({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'pat-token',
    });

    await getAuth('pat', 'MyConn', platform);
    await getAuth('PAT', 'MyConn', platform);

    expect(getPatAuthMock).toHaveBeenCalledTimes(2);
  });
});
