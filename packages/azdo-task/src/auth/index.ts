import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
import { getAzureRmAuth } from './azurerm-auth.js';
import { getBasicAuth } from './basic-auth.js';
import { getPatAuth } from './pat-auth.js';

export type ConnectionType = 'VsTeam' | 'AzureRM' | 'Generic';

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
    case 'vsteam':
      return getPatAuth(connectionName, platform);

    case 'azurerm':
      return getAzureRmAuth(connectionName, platform);

    case 'generic':
      return getBasicAuth(connectionName, platform);

    default:
      throw new Error(
        `Unsupported connection type: ${String(connectionType)}. Expected one of: VsTeam, AzureRM, Generic`
      );
  }
}

export { getAzureRmAuth, getBasicAuth, getPatAuth };
