import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';

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
    case 'pat': {
      const { getPatAuth } = await import('./pat-auth.js');
      return getPatAuth(connectionName, platform);
    }

    case 'workloadidentity': {
      const { getWorkloadIdentityAuth } = await import('./workloadidentity-auth.js');
      return getWorkloadIdentityAuth(connectionName, platform);
    }

    case 'azurerm': {
      const { getAzureRmAuth } = await import('./azurerm-auth.js');
      return getAzureRmAuth(connectionName, platform);
    }

    case 'basic': {
      const { getBasicAuth } = await import('./basic-auth.js');
      return getBasicAuth(connectionName, platform);
    }

    default:
      throw new Error(
        `Unsupported connection type: ${String(connectionType)}. Expected one of: PAT, WorkloadIdentity, AzureRM, Basic`
      );
  }
}

export async function getAzureRmAuth(
  connectionName: string,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  const { getAzureRmAuth: getAzureRmAuthImpl } = await import('./azurerm-auth.js');
  return getAzureRmAuthImpl(connectionName, platform);
}

export async function getBasicAuth(
  connectionName: string,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  const { getBasicAuth: getBasicAuthImpl } = await import('./basic-auth.js');
  return getBasicAuthImpl(connectionName, platform);
}

export async function getPatAuth(
  connectionName: string,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  const { getPatAuth: getPatAuthImpl } = await import('./pat-auth.js');
  return getPatAuthImpl(connectionName, platform);
}

export async function getWorkloadIdentityAuth(
  connectionName: string,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  const { getWorkloadIdentityAuth: getWorkloadIdentityAuthImpl } =
    await import('./workloadidentity-auth.js');
  return getWorkloadIdentityAuthImpl(connectionName, platform);
}
