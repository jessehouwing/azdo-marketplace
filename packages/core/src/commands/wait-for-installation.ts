import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import type { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi.js';
import type { TaskDefinition } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';
import { cwd } from 'process';
import type { AuthCredentials } from '../auth.js';
import { resolveExtensionIdentity } from '../extension-identity.js';
import type { ExtensionManifest } from '../manifest-reader.js';
import { readManifest, resolveManifestPaths, resolveTaskManifestPaths } from '../manifest-utils.js';
import { normalizeAccountsToServiceUrls } from '../organization-utils.js';
import type { IPlatformAdapter } from '../platform.js';
import { VsixReader } from '../vsix-reader.js';

export interface ExpectedTask {
  name: string;
  id?: string; // Task UUID (enables per-task querying for all versions)
  versions: string[]; // Expected versions (major.minor.patch)
}

export interface WaitForInstallationOptions {
  publisherId?: string;
  extensionId?: string;
  accounts: string[]; // Target organization names or URLs
  expectedTasks?: ExpectedTask[]; // Tasks with expected versions
  rootFolder?: string; // Root folder for manifest discovery
  manifestFiles?: string[]; // Paths to extension manifests (vss-extension.json) to read task versions
  vsixFile?: string; // Path to VSIX file to read task versions from
  timeoutMinutes?: number; // Default: 10
  pollingIntervalSeconds?: number; // Default: 30
}

export interface InstalledTask {
  name: string;
  id: string;
  version: string;
  friendlyName: string;
  matchesExpected: boolean; // True if this version is one of the expected versions
}

export interface WaitForInstallationResult {
  success: boolean;
  accountResults: {
    accountUrl: string;
    available: boolean;
    installedTasks: InstalledTask[];
    missingTasks: string[]; // Task names that are completely missing
    missingVersions: string[]; // Task/version combinations that are missing (e.g., "TaskName@1.0.0")
    error?: string;
  }[];
  allTasksAvailable: boolean;
}

/**
 * Resolve expected tasks from various sources
 */
async function resolveExpectedTasks(
  options: WaitForInstallationOptions,
  platform: IPlatformAdapter
): Promise<ExpectedTask[]> {
  // If expectedTasks is provided directly, use it
  if (options.expectedTasks && options.expectedTasks.length > 0) {
    platform.debug(`Using ${options.expectedTasks.length} expected tasks from options`);
    return options.expectedTasks;
  }

  // If manifestFiles are provided, read task versions from all manifests
  if (options.manifestFiles && options.manifestFiles.length > 0) {
    platform.debug(`Reading task versions from ${options.manifestFiles.length} manifest file(s)`);
    const rootFolder = options.rootFolder || cwd();
    const manifestFiles = await resolveManifestPaths(rootFolder, options.manifestFiles, platform);

    if (manifestFiles.length === 0) {
      const patternsStr = options.manifestFiles.join(', ');
      platform.warning(
        `No manifest files found matching patterns [${patternsStr}] in '${rootFolder}'.`
      );
      if (!options.vsixFile) {
        throw new Error(
          `manifestFiles was provided but no files matched patterns [${patternsStr}] in '${rootFolder}'. ` +
            `Provide valid manifest file patterns, a vsixFile, or use expectedTasks directly.`
        );
      }
      // vsixFile is available as fallback; fall through to the vsixFile block below
    } else {
      try {
        const expectedByTask = new Map<string, { id?: string; versions: Set<string> }>();

        for (const manifestFile of manifestFiles) {
          try {
            const manifest = (await readManifest(manifestFile, platform)) as ExtensionManifest;
            const taskPaths = resolveTaskManifestPaths(manifest, manifestFile, platform);

            for (const taskPath of taskPaths) {
              try {
                const taskManifest = (await readManifest(taskPath, platform)) as any;
                if (taskManifest.name && taskManifest.version) {
                  const version = `${taskManifest.version.Major}.${taskManifest.version.Minor}.${taskManifest.version.Patch}`;
                  const existing = expectedByTask.get(taskManifest.name as string) ?? {
                    versions: new Set<string>(),
                  };
                  existing.versions.add(version);
                  if (taskManifest.id) {
                    existing.id = taskManifest.id as string;
                  }
                  expectedByTask.set(taskManifest.name as string, existing);
                  platform.debug(`Found task ${taskManifest.name} v${version}`);
                }
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                platform.warning(`Failed to read task manifest ${taskPath}: ${errorMessage}`);
              }
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            platform.warning(`Failed to read manifest ${manifestFile}: ${errorMessage}`);
          }
        }

        const tasks: ExpectedTask[] = [...expectedByTask.entries()].map(
          ([name, { id, versions }]) => ({
            name,
            id,
            versions: [...versions],
          })
        );

        if (tasks.length > 0) {
          platform.debug(`Resolved ${tasks.length} task(s) from manifest file(s)`);
          return tasks;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        platform.warning(`Failed to resolve tasks from manifest files: ${errorMessage}`);
      }
    }
  }

  // If vsixFile is provided, read task versions from VSIX
  if (options.vsixFile) {
    try {
      platform.debug(`Reading task versions from VSIX: ${options.vsixFile}`);
      const reader = await VsixReader.open(options.vsixFile);

      try {
        const tasksInfo = await reader.getTasksInfo();
        const tasks: ExpectedTask[] = tasksInfo.map((task) => ({
          name: task.name,
          id: task.id,
          versions: [task.version],
        }));

        platform.debug(`Resolved ${tasks.length} tasks from VSIX`);
        return tasks;
      } finally {
        await reader.close();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      platform.warning(`Failed to read VSIX ${options.vsixFile}: ${errorMessage}`);
    }
  }

  // No expected tasks specified
  return [];
}

/**
 * Verify that an extension's tasks are installed and available in Azure DevOps organizations.
 * Uses Azure DevOps REST API to poll for task availability.
 */
export async function waitForInstallation(
  options: WaitForInstallationOptions,
  auth: AuthCredentials,
  platform: IPlatformAdapter
): Promise<WaitForInstallationResult> {
  const identity = await resolveExtensionIdentity(options, platform, 'wait-for-installation');
  const accountUrls = normalizeAccountsToServiceUrls(options.accounts);

  const timeoutMs = (options.timeoutMinutes ?? 10) * 60_000;
  const pollingIntervalMs = (options.pollingIntervalSeconds ?? 30) * 1000;

  platform.debug(
    `Verifying installation of ${identity.publisherId}.${identity.extensionId} in ${accountUrls.length} account(s)`
  );

  // Resolve expected tasks with versions
  const expectedTasks = await resolveExpectedTasks(options, platform);

  const accountResults: WaitForInstallationResult['accountResults'] = [];

  for (const accountUrl of accountUrls) {
    platform.debug(`Checking account: ${accountUrl}`);
    platform.info(
      `Polling for task availability (timeout: ${options.timeoutMinutes ?? 10} minutes, interval: ${options.pollingIntervalSeconds ?? 30} seconds)`
    );

    try {
      // Create Azure DevOps API connection
      if (!auth.token) {
        throw new Error('PAT token is required for waitForInstallation command');
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
      let finalMissingVersions: string[] = [];
      let pollCount = 0;

      // Track which versions are still pending; entries are removed as each version is confirmed
      const pendingVersionsByTask = new Map<string, Set<string>>();
      for (const task of expectedTasks) {
        if (task.versions.length > 0) {
          pendingVersionsByTask.set(task.name, new Set(task.versions));
        }
      }

      // Collect "higher version already installed" warnings; emitted once after polling ends
      const higherVersionWarnings = new Map<string, string>();

      while (Date.now() < deadline && !found) {
        pollCount++;
        const remainingMs = deadline - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60_000);

        platform.info(`Poll attempt ${pollCount} (${remainingMinutes} minute(s) remaining)`);

        try {
          // Find tasks matching the extension
          const installedTasks: InstalledTask[] = [];
          const missingTasks: string[] = [];
          const missingVersions: string[] = [];
          let unrecoverable = false;

          // If we have expected tasks, check for them specifically
          if (expectedTasks.length > 0) {
            // Fetch all task definitions once per poll (avoids downloading the full payload per task)
            platform.debug(`Querying all task definitions`);
            const allTasks: TaskDefinition[] = await taskAgentApi.getTaskDefinitions();

            for (const expectedTask of expectedTasks) {
              const pendingVersions = pendingVersionsByTask.get(expectedTask.name);
              let installedTaskVersions = allTasks.filter(
                (t) =>
                  t.name?.toLowerCase() === expectedTask.name.toLowerCase() && t.id && t.version
              );

              if (pendingVersions && pendingVersions.size > 0) {
                if (installedTaskVersions.length === 0) {
                  // Task name not found at all
                  missingTasks.push(expectedTask.name);
                  for (const ver of pendingVersions) {
                    missingVersions.push(`${expectedTask.name}@${ver}`);
                  }
                } else {
                  // Check each still-pending version
                  for (const expectedVer of [...pendingVersions]) {
                    const [expectedMajor, expectedMinor, expectedPatch] = expectedVer
                      .split('.')
                      .map(Number);

                    // Check for exact match in initial results
                    const exactMatch = installedTaskVersions.some(
                      (t) =>
                        t.version.major === expectedMajor &&
                        t.version.minor === expectedMinor &&
                        t.version.patch === expectedPatch
                    );

                    if (exactMatch) {
                      pendingVersions.delete(expectedVer);
                      platform.info(`✅ ${expectedTask.name}@${expectedVer} is now available`);
                      continue;
                    }

                    // Check if a higher version exists for the same major version line
                    const higherVersionForMajor = installedTaskVersions
                      .filter((t) => t.version.major === expectedMajor)
                      .filter((t) => {
                        if (t.version.minor > expectedMinor) return true;
                        if (t.version.minor < expectedMinor) return false;
                        return t.version.patch > expectedPatch;
                      })
                      .sort((a, b) => {
                        if (a.version.minor !== b.version.minor)
                          return b.version.minor - a.version.minor;
                        return b.version.patch - a.version.patch;
                      });

                    if (higherVersionForMajor.length > 0) {
                      const highest = higherVersionForMajor[0];
                      const highestVer = `${highest.version.major}.${highest.version.minor}.${highest.version.patch}`;
                      const warnKey = `${expectedTask.name}@${expectedVer}`;

                      // Record the warning; it will be emitted once after polling completes
                      higherVersionWarnings.set(
                        warnKey,
                        `Task ${expectedTask.name}@${expectedVer} was not found, ` +
                          `but a higher version ${highestVer} is already installed for major version ${expectedMajor}. ` +
                          `Lower task versions won't appear in Azure DevOps without first uninstalling and reinstalling the extension.`
                      );

                      // If we have the task UUID, re-query to get ALL versions for this task
                      if (expectedTask.id) {
                        platform.debug(
                          `Re-querying task ${expectedTask.name} by UUID ${expectedTask.id} to check all versions`
                        );
                        const allVersionsForTask: TaskDefinition[] =
                          await taskAgentApi.getTaskDefinitions(expectedTask.id);

                        const exactMatchInAll = allVersionsForTask.some(
                          (t) =>
                            t.version &&
                            t.version.major === expectedMajor &&
                            t.version.minor === expectedMinor &&
                            t.version.patch === expectedPatch
                        );

                        if (exactMatchInAll) {
                          pendingVersions.delete(expectedVer);
                          platform.info(`✅ ${expectedTask.name}@${expectedVer} is now available`);
                          // Update installedTaskVersions with all versions for reporting
                          installedTaskVersions = allVersionsForTask.filter(
                            (t) =>
                              t.name?.toLowerCase() === expectedTask.name.toLowerCase() &&
                              t.id &&
                              t.version
                          );
                          continue;
                        }

                        // Exact version not found even with UUID query — keep polling
                        missingVersions.push(`${expectedTask.name}@${expectedVer}`);
                        platform.debug(
                          `Version ${expectedVer} not yet available for task ${expectedTask.name} (UUID query confirmed)`
                        );
                      } else {
                        // No UUID available — we cannot verify specific versions, error out
                        unrecoverable = true;
                        missingVersions.push(`${expectedTask.name}@${expectedVer}`);
                        platform.error(
                          `Cannot verify task ${expectedTask.name}@${expectedVer}: a higher version ${highestVer} is installed ` +
                            `and no task UUID is available to query all versions. ` +
                            `Provide the task source (vsix-file or manifest-file) so the task UUID can be used for verification.`
                        );
                      }
                    } else {
                      // No version at all for this major line — still waiting
                      missingVersions.push(`${expectedTask.name}@${expectedVer}`);
                      platform.debug(
                        `Missing version ${expectedVer} for task ${expectedTask.name}`
                      );
                    }
                  }
                }
              }

              // Record all installed versions for reporting
              for (const installedTask of installedTaskVersions) {
                const installedVersion = `${installedTask.version.major}.${installedTask.version.minor}.${installedTask.version.patch}`;
                const matchesExpected = expectedTask.versions.includes(installedVersion);

                installedTasks.push({
                  name: installedTask.name,
                  id: installedTask.id,
                  version: installedVersion,
                  friendlyName: installedTask.friendlyName || installedTask.name,
                  matchesExpected,
                });
              }
            }

            // Break out of polling loop if unrecoverable
            if (unrecoverable) {
              finalInstalledTasks = installedTasks;
              finalMissingTasks = missingTasks;
              finalMissingVersions = missingVersions;
              break;
            }

            // Success if all tasks found and all required versions present
            if (missingTasks.length === 0 && missingVersions.length === 0) {
              found = true;
              finalInstalledTasks = installedTasks;
              finalMissingTasks = missingTasks;
              finalMissingVersions = missingVersions;

              // Count unique task names and total expected versions
              const uniqueTasks = new Set(expectedTasks.map((t) => t.name));
              const totalExpectedVersions = expectedTasks.reduce((sum, t) => {
                return sum + t.versions.length;
              }, 0);

              platform.info(
                `✓ All ${uniqueTasks.size} expected task(s) with ${totalExpectedVersions} version(s) found in ${accountUrl}`
              );
            } else if (missingTasks.length > 0) {
              platform.info(`Missing ${missingTasks.length} task(s): ${missingTasks.join(', ')}`);
            } else if (missingVersions.length > 0) {
              platform.info(
                `Missing ${missingVersions.length} version(s): ${missingVersions.join(', ')}`
              );
            }
          } else {
            // No expected tasks - query all and collect
            const taskDefinitions = await taskAgentApi.getTaskDefinitions();
            for (const task of taskDefinitions) {
              if (task.name && task.id && task.version) {
                installedTasks.push({
                  name: task.name,
                  id: task.id,
                  version: `${task.version.major}.${task.version.minor}.${task.version.patch}`,
                  friendlyName: task.friendlyName || task.name,
                  matchesExpected: true, // No expectations, so all match
                });
              }
            }

            if (installedTasks.length > 0) {
              found = true;
              finalInstalledTasks = installedTasks;
              finalMissingTasks = missingTasks;
              finalMissingVersions = missingVersions;
              platform.info(
                `✓ Found ${installedTasks.length} task(s) from extension in ${accountUrl}`
              );
            }
          }

          if (!found && Date.now() < deadline) {
            // Wait before next poll
            platform.info(`Waiting ${pollingIntervalMs / 1000}s before next poll...`);
            await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
          }
        } catch (error: unknown) {
          lastError = error instanceof Error ? error : new Error(String(error));
          platform.debug(`Error polling for tasks: ${lastError.message}. Retrying...`);

          if (Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
          }
        }
      }

      // Emit any higher-version warnings now that polling has finished
      for (const msg of higherVersionWarnings.values()) {
        platform.warning(msg);
      }

      if (found) {
        accountResults.push({
          accountUrl,
          available: true,
          installedTasks: finalInstalledTasks,
          missingTasks: finalMissingTasks,
          missingVersions: finalMissingVersions,
        });
      } else {
        const errorMsg = lastError
          ? `Timeout waiting for tasks. Last error: ${lastError.message}`
          : `Timeout waiting for tasks after ${options.timeoutMinutes ?? 10} minutes`;

        platform.warning(errorMsg);

        // Report only the versions that were never confirmed
        const allMissingVersions: string[] = [];
        for (const [taskName, pending] of pendingVersionsByTask) {
          for (const ver of pending) {
            allMissingVersions.push(`${taskName}@${ver}`);
          }
        }

        accountResults.push({
          accountUrl,
          available: false,
          installedTasks: [],
          missingTasks: [...pendingVersionsByTask.keys()].filter(
            (name) => (pendingVersionsByTask.get(name)?.size ?? 0) > 0
          ),
          missingVersions: allMissingVersions,
          error: errorMsg,
        });
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      platform.error(`Failed to verify installation in ${accountUrl}: ${errorMsg}`);

      // Calculate all missing versions for expected tasks
      const allMissingVersions: string[] = [];
      for (const task of expectedTasks) {
        for (const ver of task.versions) {
          allMissingVersions.push(`${task.name}@${ver}`);
        }
      }

      accountResults.push({
        accountUrl,
        available: false,
        installedTasks: [],
        missingTasks: expectedTasks.map((t) => t.name),
        missingVersions: allMissingVersions,
        error: errorMsg,
      });
    }
  }

  const allTasksAvailable = accountResults.every(
    (r) => r.available && r.missingVersions.length === 0
  );

  // Log summary
  if (allTasksAvailable) {
    platform.info(
      `✅ All tasks verified successfully across ${options.accounts.length} account(s)`
    );
  } else {
    const failedAccounts = accountResults.filter((r) => !r.available);
    const missingVersionAccounts = accountResults.filter(
      (r) => r.available && r.missingVersions.length > 0
    );

    if (failedAccounts.length > 0) {
      platform.warning(`❌ Failed to verify tasks in ${failedAccounts.length} account(s)`);
    }
    if (missingVersionAccounts.length > 0) {
      platform.warning(`⚠️ Missing versions found in ${missingVersionAccounts.length} account(s)`);
    }
  }

  return {
    success: allTasksAvailable,
    accountResults,
    allTasksAvailable,
  };
}
