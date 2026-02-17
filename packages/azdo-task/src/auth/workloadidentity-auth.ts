import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
import { getFederatedWorkloadIdentityCredentials } from 'azure-pipelines-tasks-artifacts-common/EntraWifUserServiceConnectionUtils.js';

/**
 * Get Workload Identity authentication from service connection.
 */
export async function getWorkloadIdentityAuth(
  connectionName: string,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  const token = await getFederatedWorkloadIdentityCredentials(connectionName);

  if (!token) {
    throw new Error(
      `Failed to get service connection auth for workload identity service connection '${connectionName}'`
    );
  }

  platform.setSecret(token);

  return {
    authType: 'pat',
    serviceUrl: 'https://marketplace.visualstudio.com',
    token,
  };
}
