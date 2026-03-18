import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
import { AzureRMEndpoint } from 'azure-pipelines-tasks-azure-arm-rest/azure-arm-endpoint.js';

const AZURE_DEVOPS_RESOURCE = '499b84ac-1321-427f-aa17-267ca6975798';

/**
 * Get Azure RM authentication for marketplace operations.
 *
 * Azure RM endpoints default to ARM resource tokens, but marketplace/tfx calls
 * require an Azure DevOps audience token. We override the target resource on
 * the credential before requesting a fresh access token.
 */
export async function getAzureRmAuth(
  connectionName: string,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  try {
    const endpoint = new AzureRMEndpoint(connectionName);
    const azureEndpoint = await endpoint.getEndpoint();

    // The AzureRM endpoint defaults to management audience; switch to ADO.
    const credentials = azureEndpoint.applicationTokenCredentials as {
      activeDirectoryResourceId: string;
      getToken(force?: boolean): Promise<string>;
    };
    credentials.activeDirectoryResourceId = AZURE_DEVOPS_RESOURCE;

    const token = await credentials.getToken();

    if (!token) {
      throw new Error('Failed to get access token from Azure RM endpoint');
    }

    // Mask the token immediately to prevent exposure in logs
    platform.setSecret(token);

    // For marketplace operations, use the marketplace URL
    const serviceUrl = 'https://marketplace.visualstudio.com';

    return {
      authType: 'pat',
      serviceUrl,
      token: token,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const wrappedError = new Error(
      `Failed to get Azure RM authentication: ${errorMessage}`
    ) as Error & { cause?: unknown };
    wrappedError.cause = error;
    throw wrappedError;
  }
}
