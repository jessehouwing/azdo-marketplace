import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
import { getPatAuth } from './pat-auth.js';
import { getOidcAuth } from './oidc-auth.js';

export type AuthType = 'pat' | 'oidc';

/**
 * Get authentication credentials based on auth type
 */
export async function getAuth(
  authType: AuthType,
  platform: IPlatformAdapter,
  token?: string
): Promise<AuthCredentials> {
  switch (authType) {
    case 'pat':
      if (!token) {
        throw new Error('Token is required for PAT authentication');
      }
      return getPatAuth(token, platform);
    
    case 'oidc':
      return getOidcAuth(undefined, platform);
    
    default:
      throw new Error(`Unsupported auth type: ${authType}`);
  }
}

export { getPatAuth, getOidcAuth };
