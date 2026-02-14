import { AuthCredentials } from '@extension-tasks/core';
import { getPatAuth } from './pat-auth.js';
import { getOidcAuth } from './oidc-auth.js';

export type AuthType = 'pat' | 'oidc';

/**
 * Get authentication credentials based on auth type
 */
export async function getAuth(
  authType: AuthType,
  token?: string
): Promise<AuthCredentials> {
  switch (authType) {
    case 'pat':
      if (!token) {
        throw new Error('Token is required for PAT authentication');
      }
      return getPatAuth(token);
    
    case 'oidc':
      return getOidcAuth();
    
    default:
      throw new Error(`Unsupported auth type: ${authType}`);
  }
}

export { getPatAuth, getOidcAuth };
