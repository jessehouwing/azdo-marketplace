import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import type { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi.js';
import type { TaskDefinition } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';
import type { IPlatformAdapter } from '../platform.js';
import type { AuthCredentials } from '../auth.js';
import { readManifest, resolveTaskManifestPaths } from '../manifest-utils.js';

export interface ExpectedTask {
  name: string;
  version?: string; // Expected version (major.minor.patch)
}

export interface VerifyInstallOptions {
  publisherId: string;
  extensionId: string;
  extensionTag?: string;
  accounts: string[]; // Target org URLs
  expectedTasks?: ExpectedTask[]; // Tasks with expected versions
  expectedTaskNames?: string[]; // Legacy: task names without versions (deprecated, use expectedTasks)
  manifestPath?: string; // Path to extension manifest (vss-extension.json) to read task versions
  vsixPath?: string; // Path to VSIX file to read task versions from
  timeoutMinutes?: number; // Default: 10
  pollingIntervalSeconds?: number; // Default: 30
}

export interface InstalledTask {
  name: string;
  id: string;
  version: string;
  friendlyName: string;
  versionMismatch?: boolean; // True if installed version doesn't match expected
  expectedVersion?: string; // Expected version (if checking versions)
}

export interface VerifyInstallResult {
  success: boolean;
  accountResults: {
    accountUrl: string;
    available: boolean;
    installedTasks: InstalledTask[];
    missingTasks: string[];
    versionMismatches: string[]; // Task names with version mismatches
    error?: string;
  }[];
  allTasksAvailable: boolean;
}

/**
 * Resolve expected tasks from various sources
 */
async function resolveExpectedTasks(
  options: VerifyInstallOptions,
  platform: IPlatformAdapter
): Promise<ExpectedTask[]> {
  // If expectedTasks is provided directly, use it
  if (options.expectedTasks && options.expectedTasks.length > 0) {
    platform.debug(
      `Using ${options.expectedTasks.length} expected tasks from options`
    );
    return options.expectedTasks;
  }

  // If manifestPath is provided, read task versions from manifest
  if (options.manifestPath) {
    try {
      platform.debug(`Reading task versions from manifest: ${options.manifestPath}`);
      const manifest = await readManifest(options.manifestPath, platform);
      const taskPaths = resolveTaskManifestPaths(manifest, options.manifestPath, platform);

      const tasks: ExpectedTask[] = [];
      for (const taskPath of taskPaths) {
        try {
          const taskManifest = await readManifest(taskPath, platform) as any;
          if (taskManifest.name && taskManifest.version) {
            const version = `${taskManifest.version.Major}.${taskManifest.version.Minor}.${taskManifest.version.Patch}`;
            tasks.push({
              name: taskManifest.name as string,
              version,
            });
            platform.debug(`Found task ${taskManifest.name} v${version}`);
          }
        } catch (error) {
          platform.warning(
            `Failed to read task manifest ${taskPath}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (tasks.length > 0) {
        platform.debug(`Resolved ${tasks.length} tasks from manifest`);
        return tasks;
      }
    } catch (error) {
      platform.warning(
        `Failed to read manifest ${options.manifestPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // TODO: If vsixPath is provided, extract and read task versions from VSIX
  // This would require yauzl integration
  if (options.vsixPath) {
    platform.warning('Reading task versions from VSIX is not yet implemented');
  }

  // Fallback to legacy expectedTaskNames (no version checking)
  if (options.expectedTaskNames && options.expectedTaskNames.length > 0) {
    platform.debug(
      `Using ${options.expectedTaskNames.length} task names without version checking`
    );
    return options.expectedTaskNames.map((name) => ({ name }));
  }

  // No expected tasks specified
  return [];
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

  // Resolve expected tasks with versions
  const expectedTasks = await resolveExpectedTasks(options, platform);

  const accountResults: VerifyInstallResult['accountResults'] = [];

  for (const accountUrl of options.accounts) {
    platform.debug(`Checking account: ${accountUrl}`);
    platform.info(
      `Polling for task availability (timeout: ${options.timeoutMinutes ?? 10} minutes, interval: ${options.pollingIntervalSeconds ?? 30} seconds)`
    );

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
      let finalVersionMismatches: string[] = [];
      let pollCount = 0;

      while (Date.now() < deadline && !found) {
        pollCount++;
        const remainingMs = deadline - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60_000);
        
        platform.debug(
          `Poll attempt ${pollCount} (${remainingMinutes} minute(s) remaining)`
        );

        try {
          const taskDefinitions: TaskDefinition[] =
            await taskAgentApi.getTaskDefinitions();

          // Find tasks matching the extension
          const installedTasks: InstalledTask[] = [];
          const missingTasks: string[] = [];
          const versionMismatches: string[] = [];

          // If we have expected tasks, check for them specifically
          if (expectedTasks.length > 0) {
            for (const expectedTask of expectedTasks) {
              const installedTask = taskDefinitions.find(
                (t) => t.name?.toLowerCase() === expectedTask.name.toLowerCase()
              );

              if (!installedTask || !installedTask.id || !installedTask.version) {
                missingTasks.push(expectedTask.name);
                continue;
              }

              const installedVersion = `${installedTask.version.major}.${installedTask.version.minor}.${installedTask.version.patch}`;
              const versionMismatch =
                expectedTask.version &&
                installedVersion !== expectedTask.version;

              installedTasks.push({
                name: installedTask.name!,
                id: installedTask.id,
                version: installedVersion,
                friendlyName: installedTask.friendlyName || installedTask.name!,
                versionMismatch,
                expectedVersion: expectedTask.version,
              });

              if (versionMismatch) {
                versionMismatches.push(
                  `${expectedTask.name} (expected: ${expectedTask.version}, found: ${installedVersion})`
                );
                platform.debug(
                  `Version mismatch for ${expectedTask.name}: expected ${expectedTask.version}, found ${installedVersion}`
                );
              }
            }

            // Success if all tasks found and no version mismatches
            if (missingTasks.length === 0 && versionMismatches.length === 0) {
              found = true;
              finalInstalledTasks = installedTasks;
              finalMissingTasks = missingTasks;
              finalVersionMismatches = versionMismatches;
              platform.info(
                `✓ All ${installedTasks.length} expected task(s) with correct versions found in ${accountUrl}`
              );
            } else if (missingTasks.length > 0) {
              platform.debug(
                `Missing ${missingTasks.length} task(s): ${missingTasks.join(', ')}`
              );
            } else if (versionMismatches.length > 0) {
              platform.debug(
                `Found ${versionMismatches.length} version mismatch(es): ${versionMismatches.join(', ')}`
              );
            }
          } else {
            // No expected tasks - collect all tasks
            for (const task of taskDefinitions) {
              if (task.name && task.id && task.version) {
                installedTasks.push({
                  name: task.name,
                  id: task.id,
                  version: `${task.version.major}.${task.version.minor}.${task.version.patch}`,
                  friendlyName: task.friendlyName || task.name,
                });
              }
            }

            if (installedTasks.length > 0) {
              found = true;
              finalInstalledTasks = installedTasks;
              finalMissingTasks = missingTasks;
              finalVersionMismatches = versionMismatches;
              platform.info(
                `✓ Found ${installedTasks.length} task(s) from extension in ${accountUrl}`
              );
            }
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
          versionMismatches: finalVersionMismatches,
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
          missingTasks: expectedTasks.map((t) => t.name),
          versionMismatches: [],
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
        missingTasks: expectedTasks.map((t) => t.name),
        versionMismatches: [],
        error: errorMsg,
      });
    }
  }

  const allTasksAvailable = accountResults.every(
    (r) => r.available && r.versionMismatches.length === 0
  );

  // Log summary
  if (allTasksAvailable) {
    platform.info(
      `✅ All tasks verified successfully across ${options.accounts.length} account(s)`
    );
  } else {
    const failedAccounts = accountResults.filter((r) => !r.available);
    const mismatchAccounts = accountResults.filter(
      (r) => r.available && r.versionMismatches.length > 0
    );
    
    if (failedAccounts.length > 0) {
      platform.warning(
        `❌ Failed to verify tasks in ${failedAccounts.length} account(s)`
      );
    }
    if (mismatchAccounts.length > 0) {
      platform.warning(
        `⚠️ Version mismatches found in ${mismatchAccounts.length} account(s)`
      );
    }
  }

  return {
    success: allTasksAvailable,
    accountResults,
    allTasksAvailable,
  };
}
