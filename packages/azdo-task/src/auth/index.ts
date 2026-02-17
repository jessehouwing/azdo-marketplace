import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
import { getAzureRmAuth } from './azurerm-auth.js';
import { getBasicAuth } from './basic-auth.js';
import { getPatAuth } from './pat-auth.js';
import { getWorkloadIdentityAuth } from './workloadidentity-auth.js';

export type ConnectionType = 'PAT' | 'WorkloadIdentity' | 'AzureRM' | 'Basic';

/**
 * Get authentication credentials based on connection type
 */
export async function getAuth(
  connectionType: string,
  connectionName: string,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  const normalizedConnectionType = connectionType.trim().toLowerCase();

  switch (normalizedConnectionType) {
    case 'pat':
      return getPatAuth(connectionName, platform);

    case 'workloadidentity':
      return getWorkloadIdentityAuth(connectionName, platform);

    case 'azurerm':
      return getAzureRmAuth(connectionName, platform);

    case 'basic':
      return getBasicAuth(connectionName, platform);

    default:
      throw new Error(
        `Unsupported connection type: ${String(connectionType)}. Expected one of: PAT, WorkloadIdentity, AzureRM, Basic`
      );
  }
}

export { getAzureRmAuth, getBasicAuth, getPatAuth, getWorkloadIdentityAuth };
