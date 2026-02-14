import { AuthCredentials } from '@extension-tasks/core';

/**
 * Get PAT authentication from GitHub Actions input
 */
export async function getPatAuth(token: string): Promise<AuthCredentials> {
  if (!token) {
    throw new Error('PAT token is required');
  }

  // For marketplace operations, use the marketplace URL
  const serviceUrl = 'https://marketplace.visualstudio.com';

  return {
    authType: 'pat',
    serviceUrl,
    token,
  };
}
