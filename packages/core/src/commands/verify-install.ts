import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import type { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi.js';
import type { TaskDefinition } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';
import type { IPlatformAdapter } from '../platform.js';
import type { AuthCredentials } from '../auth.js';

export interface VerifyInstallOptions {
  publisherId: string;
  extensionId: string;
  extensionTag?: string;
  accounts: string[]; // Target org URLs
  expectedTaskNames?: string[]; // If known; otherwise all tasks from extension are checked
  timeoutMinutes?: number; // Default: 10
  pollingIntervalSeconds?: number; // Default: 30
}

export interface InstalledTask {
  name: string;
  id: string;
  version: string;
  friendlyName: string;
}

export interface VerifyInstallResult {
  success: boolean;
  accountResults: {
    accountUrl: string;
    available: boolean;
    installedTasks: InstalledTask[];
    missingTasks: string[];
    error?: string;
  }[];
  allTasksAvailable: boolean;
}

/**
 * Verify that an extension's tasks are installed and available in Azure DevOps organizations.
 * Uses Azure DevOps REST API to poll for task availability.
 */
export async function verifyInstall(
  options: VerifyInstallOptions,
  auth: AuthCredentials,
  platform: IPlatformAdapter
): Promise<VerifyInstallResult> {
  const fullExtensionId = options.extensionTag
    ? `${options.extensionId}${options.extensionTag}`
    : options.extensionId;

  const timeoutMs = (options.timeoutMinutes ?? 10) * 60_000;
  const pollingIntervalMs = (options.pollingIntervalSeconds ?? 30) * 1000;

  platform.debug(
    `Verifying installation of ${options.publisherId}.${fullExtensionId} in ${options.accounts.length} account(s)`
  );

  const accountResults: VerifyInstallResult['accountResults'] = [];

  for (const accountUrl of options.accounts) {
    platform.debug(`Checking account: ${accountUrl}`);

    try {
      // Create Azure DevOps API connection
      if (!auth.token) {
        throw new Error('PAT token is required for verifyInstall command');
      }

      const handler = getPersonalAccessTokenHandler(auth.token);
      const connection = new WebApi(accountUrl, handler);
      const taskAgentApi: ITaskAgentApi = await connection.getTaskAgentApi();

      // Poll until tasks appear or timeout
      const deadline = Date.now() + timeoutMs;
      let lastError: Error | undefined;
      let found = false;
      let finalInstalledTasks: InstalledTask[] = [];
      let finalMissingTasks: string[] = [];

      while (Date.now() < deadline && !found) {
        try {
          const taskDefinitions: TaskDefinition[] =
            await taskAgentApi.getTaskDefinitions();

          // Find tasks matching the extension
          const installedTasks: InstalledTask[] = [];

          for (const task of taskDefinitions) {
            // Check if task belongs to this extension
            // Check if this task belongs to our extension by checking:
            // 1. Task name matches one of our expected tasks (if provided)
            // 2. Or, if no expected tasks, include all tasks (we'll filter later if needed)
            const matchesExpectedTask =
              !options.expectedTaskNames ||
              (options.expectedTaskNames.some(
                (expectedName) =>
                  task.name?.toLowerCase() === expectedName.toLowerCase()
              ));

            // Collect tasks that match criteria
            if (matchesExpectedTask && task.name && task.id && task.version) {
              installedTasks.push({
                name: task.name,
                id: task.id,
                version: `${task.version.major}.${task.version.minor}.${task.version.patch}`,
                friendlyName: task.friendlyName || task.name,
              });
            }
          }

          // Check if all expected tasks are present
          const missingTasks: string[] = [];
          if (options.expectedTaskNames) {
            for (const expectedName of options.expectedTaskNames) {
              const foundTask = installedTasks.some(
                (t) => t.name.toLowerCase() === expectedName.toLowerCase()
              );
              if (!foundTask) {
                missingTasks.push(expectedName);
              }
            }

            if (missingTasks.length === 0) {
              found = true;
              finalInstalledTasks = installedTasks;
              finalMissingTasks = missingTasks;
              platform.info(
                `✓ All ${installedTasks.length} expected task(s) found in ${accountUrl}`
              );
            } else {
              platform.debug(
                `Missing ${missingTasks.length} task(s): ${missingTasks.join(', ')}`
              );
            }
          } else if (installedTasks.length > 0) {
            // If no expected tasks specified, consider success if any tasks found
            found = true;
            finalInstalledTasks = installedTasks;
            finalMissingTasks = missingTasks;
            platform.info(
              `✓ Found ${installedTasks.length} task(s) from extension in ${accountUrl}`
            );
          }

          if (!found && Date.now() < deadline) {
            // Wait before next poll
            platform.debug(
              `Waiting ${pollingIntervalMs / 1000}s before next poll...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, pollingIntervalMs)
            );
          }
        } catch (error) {
          lastError =
            error instanceof Error ? error : new Error(String(error));
          platform.debug(
            `Error polling for tasks: ${lastError.message}. Retrying...`
          );

          if (Date.now() < deadline) {
            await new Promise((resolve) =>
              setTimeout(resolve, pollingIntervalMs)
            );
          }
        }
      }

      if (found) {
        accountResults.push({
          accountUrl,
          available: true,
          installedTasks: finalInstalledTasks,
          missingTasks: finalMissingTasks,
        });
      } else {
        const errorMsg = lastError
          ? `Timeout waiting for tasks. Last error: ${lastError.message}`
          : `Timeout waiting for tasks after ${options.timeoutMinutes ?? 10} minutes`;

        platform.warning(errorMsg);

        accountResults.push({
          accountUrl,
          available: false,
          installedTasks: [],
          missingTasks: options.expectedTaskNames || [],
          error: errorMsg,
        });
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      platform.error(`Failed to verify installation in ${accountUrl}: ${errorMsg}`);

      accountResults.push({
        accountUrl,
        available: false,
        installedTasks: [],
        missingTasks: options.expectedTaskNames || [],
        error: errorMsg,
      });
    }
  }

  const allTasksAvailable = accountResults.every((r) => r.available);

  return {
    success: allTasksAvailable,
    accountResults,
    allTasksAvailable,
  };
}
