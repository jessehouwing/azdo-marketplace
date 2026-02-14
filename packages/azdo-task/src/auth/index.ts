import { AuthCredentials } from '@extension-tasks/core';
import { getPatAuth } from './pat-auth.js';
import { getBasicAuth } from './basic-auth.js';
import { getAzureRmAuth } from './azurerm-auth.js';

export type ConnectionType = 'connectedService:VsTeam' | 'connectedService:AzureRM' | 'connectedService:Generic';

/**
 * Get authentication credentials based on connection type
 */
export async function getAuth(
  connectionType: ConnectionType,
  connectionName: string
): Promise<AuthCredentials> {
  switch (connectionType) {
    case 'connectedService:VsTeam':
      return getPatAuth(connectionName);
    
    case 'connectedService:AzureRM':
      return getAzureRmAuth(connectionName);
    
    case 'connectedService:Generic':
      return getBasicAuth(connectionName);
    
    default:
      throw new Error(`Unsupported connection type: ${connectionType}`);
  }
}

export { getPatAuth, getBasicAuth, getAzureRmAuth };
