import * as tl from 'azure-pipelines-task-lib/task.js';
import { AuthCredentials } from '@extension-tasks/core';

/**
 * Get PAT authentication from service connection
 */
export async function getPatAuth(connectionName: string): Promise<AuthCredentials> {
  const endpoint = tl.getEndpointAuthorization(connectionName, false);
  if (!endpoint) {
    throw new Error(`Service connection '${connectionName}' not found`);
  }

  const pat = endpoint.parameters['apitoken'] || endpoint.parameters['password'];
  if (!pat) {
    throw new Error(`PAT not found in service connection '${connectionName}'`);
  }

  // For marketplace operations, use the marketplace URL
  const serviceUrl = 'https://marketplace.visualstudio.com';

  return {
    authType: 'pat',
    serviceUrl,
    token: pat,
  };
}
