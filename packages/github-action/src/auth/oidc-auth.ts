import * as core from '@actions/core';
import { AuthCredentials } from '@extension-tasks/core';

/**
 * Get GitHub OIDC token for marketplace authentication
 * 
 * Uses GitHub Actions OIDC functionality to get an ID token.
 * Similar to Azure Pipelines OIDC approach, this gets a token from the platform
 * and attempts to use it for marketplace operations.
 * 
 * Note: This is a best-effort implementation. The Visual Studio Marketplace
 * may require additional configuration to accept GitHub OIDC tokens directly.
 * A token exchange service might be needed for full production support.
 * 
 * Requirements:
 * - GitHub Actions workflow must have id-token: write permission
 * - Marketplace may need to be configured to accept GitHub as OIDC provider
 * 
 * @param audience - Optional audience claim for the OIDC token (defaults to marketplace URL)
 */
export async function getOidcAuth(audience?: string): Promise<AuthCredentials> {
  try {
    // Use marketplace URL as the default audience
    const marketplaceUrl = 'https://marketplace.visualstudio.com';
    const aud = audience || marketplaceUrl;
    
    // Get GitHub OIDC token
    // Requires: permissions.id-token: write in the workflow
    const token = await core.getIDToken(aud);
    
    if (!token) {
      throw new Error('Failed to get OIDC token from GitHub Actions');
    }
    
    // Return credentials in the same format as other auth providers
    // The marketplace may need additional configuration to accept this token
    return {
      authType: 'pat', // Use 'pat' type as the token format is similar
      serviceUrl: marketplaceUrl,
      token: token,
    };
  } catch (error) {
    throw new Error(
      `Failed to get GitHub OIDC authentication: ${error instanceof Error ? error.message : String(error)}. ` +
      'Ensure your workflow has "id-token: write" permission and that the marketplace is configured to accept GitHub OIDC tokens.'
    );
  }
}
