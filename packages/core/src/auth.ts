/**
 * Authentication types and interfaces
 */

/**
 * Authentication credentials for accessing the marketplace or Azure DevOps services
 */
export interface AuthCredentials {
  /** Type of authentication */
  authType: 'pat' | 'basic';
  /** Service URL (marketplace or Azure DevOps organization URL) */
  serviceUrl: string;
  /** Personal Access Token (for PAT auth) */
  token?: string;
  /** Username (for basic auth) */
  username?: string;
  /** Password (for basic auth) */
  password?: string;
}

/**
 * Auth provider interface
 * Platform-specific implementations handle PAT endpoints, OIDC/Entra flows, etc.
 */
export interface IAuthProvider {
  /**
   * Resolve credentials from platform-specific configuration.
   * @returns Promise resolving to authentication credentials
   */
  getCredentials(): Promise<AuthCredentials>;
}
