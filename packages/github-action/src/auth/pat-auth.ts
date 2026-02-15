import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';

/**
 * Get PAT authentication from GitHub Actions input
 */
export async function getPatAuth(
  token: string,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  if (!token) {
    throw new Error('PAT token is required');
  }

  // Mask the secret immediately to prevent exposure in logs
  platform.setSecret(token);

  // For marketplace operations, use the marketplace URL
  const serviceUrl = 'https://marketplace.visualstudio.com';

  return {
    authType: 'pat',
    serviceUrl,
    token,
  };
}
