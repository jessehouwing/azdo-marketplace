import {
  AuthCredentials,
  installExtension,
  normalizeAccountToServiceUrl,
  packageExtension,
  publishExtension,
  queryVersion,
  shareExtension,
  showExtension,
  TaskResult,
  TfxManager,
  unpublishExtension,
  unshareExtension,
  validateAccountUrl,
  validateExtensionId,
  validateNodeAvailable,
  validateNpmAvailable,
  validatePublisherId,
  validateTfxAvailable,
  validateVersion,
  waitForInstallation,
  waitForValidation,
} from '@extension-tasks/core';
import * as tl from 'azure-pipelines-task-lib/task.js';
import { getAuth } from './auth/index.js';
import { AzdoAdapter } from './azdo-adapter.js';

async function run(): Promise<void> {
  try {
    const platform = new AzdoAdapter();

    // Validate node is available (always required)
    await validateNodeAvailable(platform);

    // Get the operation to perform
    const operation = platform.getInput('operation', true);
    if (!operation) {
      throw new Error('Operation is required');
    }

    platform.debug(`Starting operation: ${operation}`);

    // Validate common inputs early to fail fast
    const publisherId = platform.getInput('publisherId');
    if (publisherId) {
      validatePublisherId(publisherId);
    }

    const extensionId = platform.getInput('extensionId');
    if (extensionId) {
      validateExtensionId(extensionId);
    }

    const extensionVersion = platform.getInput('extensionVersion');
    if (extensionVersion) {
      if (operation === 'install') {
        throw new Error('install does not support extensionVersion');
      }
      validateVersion(extensionVersion);
    }

    // Create TfxManager
    const tfxVersion = platform.getInput('tfxVersion') || 'built-in';

    // Validate binaries based on tfx version mode
    if (tfxVersion === 'path') {
      // User wants to use tfx from PATH
      await validateTfxAvailable(platform);
    } else if (tfxVersion !== 'built-in') {
      // Version spec mode - need npm to download
      await validateNpmAvailable(platform);
    }

    const tfxManager = new TfxManager({ tfxVersion: tfxVersion, platform });

    // Get authentication if needed (not required for package)
    let auth;
    if (operation !== 'package') {
      const connectionType = platform.getInput('connectionType', true);
      const normalizedConnectionType = connectionType.trim().toLowerCase();

      // Get the appropriate connection name based on type
      let connectionName: string | undefined;
      if (normalizedConnectionType === 'pat') {
        connectionName = platform.getInput('connectionNamePAT', true);
      } else if (normalizedConnectionType === 'workloadidentity') {
        connectionName = platform.getInput('connectionNameWorkloadIdentity', true);
      } else if (normalizedConnectionType === 'azurerm') {
        connectionName = platform.getInput('connectionNameAzureRm', true);
      } else if (normalizedConnectionType === 'basic') {
        connectionName = platform.getInput('connectionNameBasic', true);
      }

      if (!connectionName) {
        throw new Error('Service connection name is required for this operation');
      }

      auth = await getAuth(connectionType, connectionName, platform);

      // Validate service URL if present
      if (operation !== 'install' && operation !== 'wait-for-installation' && auth.serviceUrl) {
        validateAccountUrl(auth.serviceUrl);
      }
    }

    // Validate account URLs for operations that need them
    if (operation === 'install' || operation === 'wait-for-installation') {
      const accounts = platform.getDelimitedInput('accounts', ';', false);
      accounts.forEach((account) => {
        if (account) {
          validateAccountUrl(normalizeAccountToServiceUrl(account));
        }
      });
    }

    // Route to appropriate command
    switch (operation) {
      case 'package':
        await runPackage(platform, tfxManager);
        break;

      case 'publish':
        await runPublish(platform, tfxManager, auth);
        break;

      case 'unpublish':
        await runUnpublish(platform, tfxManager, auth);
        break;

      case 'share':
        await runShare(platform, tfxManager, auth);
        break;

      case 'unshare':
        await runUnshare(platform, tfxManager, auth);
        break;

      case 'install':
        await runInstall(platform, tfxManager, auth);
        break;

      case 'show':
        await runShow(platform, tfxManager, auth);
        break;

      case 'query-version':
        await runQueryVersion(platform, tfxManager, auth);
        break;

      case 'wait-for-validation':
        await runWaitForValidation(platform, tfxManager, auth);
        break;

      case 'wait-for-installation':
        await runWaitForInstallation(platform, auth);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    platform.info('✅ Operation completed successfully');
    platform.setResult(TaskResult.Succeeded, `${operation} completed successfully`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    tl.error(message);
    tl.setResult(tl.TaskResult.Failed, message);
  }
}

function getUpdateTasksVersionMode(
  platform: AzdoAdapter
): 'none' | 'major' | 'minor' | 'patch' | undefined {
  const value = platform.getInput('updateTasksVersion');
  if (!value) {
    return undefined;
  }

  if (value === 'none' || value === 'major' || value === 'minor' || value === 'patch') {
    return value;
  }

  throw new Error(
    `Invalid updateTasksVersion value '${value}'. Expected one of: none, major, minor, patch.`
  );
}

async function runPackage(platform: AzdoAdapter, tfxManager: TfxManager): Promise<void> {
  const extensionPricingInput = platform.getInput('extensionPricing');

  const options = {
    localizationRoot: platform.getInput('localizationRoot'),
    manifestGlobs: platform.getDelimitedInput('manifestFile', '\n'),
    publisherId: platform.getInput('publisherId'),
    extensionId: platform.getInput('extensionId'),
    extensionVersion: platform.getInput('extensionVersion'),
    extensionName: platform.getInput('extensionName'),
    extensionVisibility: platform.getInput('extensionVisibility') as
      | 'private'
      | 'public'
      | 'private_preview'
      | 'public_preview'
      | undefined,
    extensionPricing:
      extensionPricingInput && extensionPricingInput !== 'default'
        ? (extensionPricingInput as 'free' | 'paid' | 'trial')
        : undefined,
    updateTasksVersion: getUpdateTasksVersionMode(platform),
    updateTasksId: platform.getBoolInput('updateTasksId'),
    outputPath: platform.getInput('outputPath'),
    bypassValidation: platform.getBoolInput('bypassValidation'),
    revVersion: platform.getBoolInput('revVersion'),
  };

  const result = await packageExtension(options, tfxManager, platform);

  if (result.vsixPath) {
    platform.setOutput('vsixPath', result.vsixPath);
  }
}

async function runPublish(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const use = platform.getInput('use', true) as 'manifest' | 'vsix';
  const extensionPricingInput = platform.getInput('extensionPricing');

  const result = await publishExtension(
    {
      publishSource: use,
      vsixFile: use === 'vsix' ? platform.getInput('vsixFile', true) : undefined,
      manifestGlobs:
        use === 'manifest' ? platform.getDelimitedInput('manifestFile', '\n', true) : undefined,
      localizationRoot: use === 'manifest' ? platform.getInput('localizationRoot') : undefined,
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      extensionVersion: platform.getInput('extensionVersion'),
      extensionName: platform.getInput('extensionName'),
      extensionVisibility: platform.getInput('extensionVisibility') as
        | 'private'
        | 'public'
        | 'private_preview'
        | 'public_preview'
        | undefined,
      extensionPricing:
        extensionPricingInput && extensionPricingInput !== 'default'
          ? (extensionPricingInput as 'free' | 'paid' | 'trial')
          : undefined,
      outputPath: platform.getInput('outputPath'),
      noWaitValidation: platform.getBoolInput('noWaitValidation'),
      bypassValidation: platform.getBoolInput('bypassValidation'),
      updateTasksVersion: getUpdateTasksVersionMode(platform),
      updateTasksId: platform.getBoolInput('updateTasksId'),
    },
    auth,
    tfxManager,
    platform
  );

  platform.setOutput('published', String(result.published));

  platform.debug(`Published: ${JSON.stringify(result)}`);
}

async function runUnpublish(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  await unpublishExtension(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      vsixPath: platform.getInput('vsixFile') || platform.getInput('vsixPath'),
    },
    auth,
    tfxManager,
    platform
  );
}

async function runShare(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  await shareExtension(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      vsixPath: platform.getInput('vsixFile') || platform.getInput('vsixPath'),
      shareWith: platform.getDelimitedInput('accounts', '\n', true),
    },
    auth,
    tfxManager,
    platform
  );

  platform.setOutput('shared', 'true');
}

async function runUnshare(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  await unshareExtension(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      vsixPath: platform.getInput('vsixFile') || platform.getInput('vsixPath'),
      unshareWith: platform.getDelimitedInput('accounts', '\n', true),
    },
    auth,
    tfxManager,
    platform
  );

  platform.setOutput('unshared', 'true');
}

async function runInstall(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const result = await installExtension(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      vsixPath: platform.getInput('vsixFile') || platform.getInput('vsixPath'),
      accounts: platform.getDelimitedInput('accounts', '\n', true),
    },
    auth,
    tfxManager,
    platform
  );

  if (!result.allSuccess) {
    throw new Error(`Some accounts failed to install the extension`);
  }

  platform.setOutput('installed', 'true');
}

async function runShow(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const options = {
    publisherId: platform.getInput('publisherId', true),
    extensionId: platform.getInput('extensionId', true),
  };

  const result = await showExtension(options, auth, tfxManager, platform);

  if (result.metadata) {
    platform.setOutput('extensionMetadata', JSON.stringify(result.metadata));
  }
}

async function runQueryVersion(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: any
): Promise<void> {
  const result = await queryVersion(
    {
      publisherId: platform.getInput('publisherId', true),
      extensionId: platform.getInput('extensionId', true),
      versionAction:
        (platform.getInput('versionAction') as 'none' | 'major' | 'minor' | 'patch' | undefined) ===
        'major'
          ? 'Major'
          : (platform.getInput('versionAction') as
                | 'none'
                | 'major'
                | 'minor'
                | 'patch'
                | undefined) === 'minor'
            ? 'Minor'
            : (platform.getInput('versionAction') as
                  | 'none'
                  | 'major'
                  | 'minor'
                  | 'patch'
                  | undefined) === 'patch'
              ? 'Patch'
              : 'None',
      extensionVersionOverrideVariable: platform.getInput('extensionVersionOverride'),
    },
    auth,
    tfxManager,
    platform
  );

  if (platform.getBoolInput('setBuildNumber')) {
    tl.command('build.updatebuildnumber', undefined, result.proposedVersion);
  }

  platform.setOutput('proposedVersion', result.proposedVersion);
  platform.setOutput('currentVersion', result.currentVersion);
}

async function runWaitForValidation(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const result = await waitForValidation(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      vsixPath: platform.getInput('vsixFile') || platform.getInput('vsixPath'),
      extensionVersion: platform.getInput('extensionVersion'),
      maxRetries: parseInt(platform.getInput('maxRetries') || '10'),
      minTimeout: parseInt(platform.getInput('minTimeout') || '1'),
      maxTimeout: parseInt(platform.getInput('maxTimeout') || '15'),
    },
    auth,
    tfxManager,
    platform
  );

  if (result.status !== 'success') {
    throw new Error(`Validation failed with status: ${result.status}`);
  }

  platform.setOutput('waitForValidation', 'true');
}

async function runWaitForInstallation(platform: AzdoAdapter, auth: AuthCredentials): Promise<void> {
  const use = platform.getInput('use') as 'manifest' | 'vsix' | undefined;
  const expectedTasksInput = platform.getInput('expectedTasks');
  let expectedTasks;
  if (expectedTasksInput) {
    try {
      expectedTasks = JSON.parse(expectedTasksInput);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const wrappedError = new Error(`Failed to parse expectedTasks: ${errorMessage}`) as Error & {
        cause?: unknown;
      };
      wrappedError.cause = error;
      throw wrappedError;
    }
  }

  const result = await waitForInstallation(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      accounts: platform.getDelimitedInput('accounts', '\n', true),
      expectedTasks,
      manifestFiles:
        use === 'manifest' ? platform.getDelimitedInput('manifestFile', '\n') : undefined,
      vsixPath:
        use === 'vsix' ? platform.getInput('vsixFile') || platform.getInput('vsixPath') : undefined,
      timeoutMinutes: parseInt(platform.getInput('timeoutMinutes') || '10'),
      pollingIntervalSeconds: parseInt(platform.getInput('pollingIntervalSeconds') || '30'),
    },
    auth,
    platform
  );

  if (!result.success) {
    throw new Error(`Verification failed - not all tasks are available`);
  }

  platform.setOutput('waitForInstallation', 'true');
}

// Run the task
void run();
