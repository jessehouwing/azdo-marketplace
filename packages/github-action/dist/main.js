import * as core from '@actions/core';
import { installExtension, normalizeAccountToServiceUrl, packageExtension, publishExtension, queryVersion, shareExtension, showExtension, TaskResult, TfxManager, unpublishExtension, unshareExtension, validateAccountUrl, validateAzureCliAvailable, validateExtensionId, validateNodeAvailable, validateNpmAvailable, validatePublisherId, validateTfxAvailable, validateVersion, waitForInstallation, waitForValidation, } from '@extension-tasks/core';
import { getAuth } from './auth/index.js';
import { GitHubAdapter } from './github-adapter.js';
async function validateSingleFileInputs(platform, inputs) {
    for (const input of inputs) {
        if (!input.value) {
            continue;
        }
        const exists = await platform.fileExists(input.value);
        if (!exists) {
            throw new Error(`Input '${input.name}' must reference an existing file. File not found: ${input.value}`);
        }
    }
}
async function run() {
    try {
        const platform = new GitHubAdapter();
        // Validate node is available (always required)
        await validateNodeAvailable(platform);
        // Get the operation to perform
        const operation = platform.getInput('operation', true);
        if (!operation) {
            throw new Error('Operation is required');
        }
        platform.debug(`Starting operation: ${operation}`);
        // Validate common inputs early to fail fast
        const publisherId = platform.getInput('publisher-id');
        if (publisherId) {
            validatePublisherId(publisherId);
        }
        const extensionId = platform.getInput('extension-id');
        if (extensionId) {
            validateExtensionId(extensionId);
        }
        const extensionVersion = platform.getInput('extension-version');
        if (extensionVersion) {
            if (operation === 'install') {
                throw new Error('install does not support extension-version');
            }
            validateVersion(extensionVersion);
        }
        await validateSingleFileInputs(platform, [
            { name: 'vsix-file', value: platform.getInput('vsix-file') },
            { name: 'manifest-file-js', value: platform.getInput('manifest-file-js') },
            { name: 'overrides-file', value: platform.getInput('overrides-file') },
        ]);
        // Create TfxManager
        const tfxVersion = platform.getInput('tfx-version') || 'built-in';
        // Validate binaries based on tfx version mode
        if (tfxVersion === 'path') {
            // User wants to use tfx from PATH
            await validateTfxAvailable(platform);
        }
        else if (tfxVersion !== 'built-in') {
            // Version spec mode - need npm to download
            await validateNpmAvailable(platform);
        }
        const tfxManager = new TfxManager({ tfxVersion: tfxVersion, platform });
        // Get authentication if needed (not required for package)
        let auth;
        if (operation !== 'package') {
            const authType = (platform.getInput('auth-type') || 'pat');
            // For OIDC auth, validate Azure CLI is available
            if (authType === 'oidc') {
                await validateAzureCliAvailable(platform);
            }
            // Get authentication credentials with optional service/marketplace URLs
            const token = platform.getInput('token');
            const username = platform.getInput('username');
            const serviceUrl = operation === 'install' || operation === 'wait-for-installation'
                ? undefined
                : platform.getInput('service-url');
            auth = await getAuth(authType, platform, {
                token,
                username,
                serviceUrl,
            });
            // Secret masking is now handled inside auth providers
            // But we keep this as defense in depth
            if (auth.token) {
                platform.setSecret(auth.token);
            }
            if (auth.password) {
                platform.setSecret(auth.password);
            }
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        core.setFailed(message);
    }
}
function getUpdateTasksVersionMode(platform) {
    const value = platform.getInput('update-tasks-version');
    if (!value) {
        return undefined;
    }
    if (value === 'none' || value === 'major' || value === 'minor' || value === 'patch') {
        return value;
    }
    throw new Error(`Invalid update-tasks-version value '${value}'. Expected one of: none, major, minor, patch.`);
}
async function runPackage(platform, tfxManager) {
    const extensionPricingInput = platform.getInput('extension-pricing');
    const options = {
        localizationRoot: platform.getInput('localization-root'),
        manifestGlobs: platform.getDelimitedInput('manifest-file', '\n'),
        manifestFileJs: platform.getInput('manifest-file-js'),
        overridesFile: platform.getInput('overrides-file'),
        publisherId: platform.getInput('publisher-id'),
        extensionId: platform.getInput('extension-id'),
        extensionVersion: platform.getInput('extension-version'),
        extensionName: platform.getInput('extension-name'),
        extensionVisibility: platform.getInput('extension-visibility'),
        extensionPricing: extensionPricingInput && extensionPricingInput !== 'default'
            ? extensionPricingInput
            : undefined,
        updateTasksVersion: getUpdateTasksVersionMode(platform),
        updateTasksId: platform.getBoolInput('update-tasks-id'),
        outputPath: platform.getInput('output-path'),
        bypassValidation: platform.getBoolInput('bypass-validation'),
    };
    const result = await packageExtension(options, tfxManager, platform);
    if (result.vsixPath) {
        platform.setOutput('vsix-path', result.vsixPath);
    }
}
async function runPublish(platform, tfxManager, auth) {
    const publishSource = platform.getInput('publish-source', true);
    const extensionPricingInput = platform.getInput('extension-pricing');
    const result = await publishExtension({
        publishSource,
        vsixFile: publishSource === 'vsix' ? platform.getInput('vsix-file', true) : undefined,
        manifestGlobs: publishSource === 'manifest'
            ? platform.getDelimitedInput('manifest-file', '\n')
            : undefined,
        manifestFileJs: publishSource === 'manifest' ? platform.getInput('manifest-file-js') : undefined,
        overridesFile: publishSource === 'manifest' ? platform.getInput('overrides-file') : undefined,
        localizationRoot: publishSource === 'manifest' ? platform.getInput('localization-root') : undefined,
        publisherId: platform.getInput('publisher-id'),
        extensionId: platform.getInput('extension-id'),
        extensionVersion: platform.getInput('extension-version'),
        extensionName: platform.getInput('extension-name'),
        extensionVisibility: platform.getInput('extension-visibility'),
        extensionPricing: extensionPricingInput && extensionPricingInput !== 'default'
            ? extensionPricingInput
            : undefined,
        outputPath: platform.getInput('output-path'),
        noWaitValidation: platform.getBoolInput('no-wait-validation'),
        bypassValidation: platform.getBoolInput('bypass-validation'),
        updateTasksVersion: getUpdateTasksVersionMode(platform),
        updateTasksId: platform.getBoolInput('update-tasks-id'),
    }, auth, tfxManager, platform);
    if (result.vsixPath) {
        platform.setOutput('vsix-path', result.vsixPath);
    }
    platform.debug(`Published: ${JSON.stringify(result)}`);
}
async function runUnpublish(platform, tfxManager, auth) {
    await unpublishExtension({
        publisherId: platform.getInput('publisher-id'),
        extensionId: platform.getInput('extension-id'),
        vsixPath: platform.getInput('vsix-path'),
    }, auth, tfxManager, platform);
}
async function runShare(platform, tfxManager, auth) {
    await shareExtension({
        publisherId: platform.getInput('publisher-id'),
        extensionId: platform.getInput('extension-id'),
        vsixPath: platform.getInput('vsix-path'),
        shareWith: platform.getDelimitedInput('accounts', '\n', true),
    }, auth, tfxManager, platform);
}
async function runUnshare(platform, tfxManager, auth) {
    await unshareExtension({
        publisherId: platform.getInput('publisher-id'),
        extensionId: platform.getInput('extension-id'),
        vsixPath: platform.getInput('vsix-path'),
        unshareWith: platform.getDelimitedInput('accounts', '\n', true),
    }, auth, tfxManager, platform);
}
async function runInstall(platform, tfxManager, auth) {
    const result = await installExtension({
        publisherId: platform.getInput('publisher-id'),
        extensionId: platform.getInput('extension-id'),
        vsixPath: platform.getInput('vsix-path'),
        accounts: platform.getDelimitedInput('accounts', '\n', true),
    }, auth, tfxManager, platform);
    if (!result.allSuccess) {
        throw new Error(`Some accounts failed to install the extension`);
    }
}
async function runShow(platform, tfxManager, auth) {
    const options = {
        publisherId: platform.getInput('publisher-id', true),
        extensionId: platform.getInput('extension-id', true),
    };
    const result = await showExtension(options, auth, tfxManager, platform);
    if (result.metadata) {
        platform.setOutput('extension-metadata', JSON.stringify(result.metadata));
    }
}
async function runQueryVersion(platform, tfxManager, auth) {
    const normalizedVersionAction = (() => {
        const input = (platform.getInput('version-action') ?? 'none').trim().toLowerCase();
        if (input === 'major') {
            return 'Major';
        }
        if (input === 'minor') {
            return 'Minor';
        }
        if (input === 'patch') {
            return 'Patch';
        }
        return 'None';
    })();
    const result = await queryVersion({
        publisherId: platform.getInput('publisher-id', true),
        extensionId: platform.getInput('extension-id', true),
        versionAction: normalizedVersionAction,
        extensionVersionOverrideVariable: platform.getInput('extension-version-override'),
    }, auth, tfxManager, platform);
    platform.setOutput('proposed-version', result.proposedVersion);
    platform.setOutput('current-version', result.currentVersion);
}
async function runWaitForValidation(platform, tfxManager, auth) {
    const timeoutMinutesInput = platform.getInput('timeout-minutes');
    const pollingIntervalSecondsInput = platform.getInput('polling-interval-seconds');
    const result = await waitForValidation({
        publisherId: platform.getInput('publisher-id'),
        extensionId: platform.getInput('extension-id'),
        vsixPath: platform.getInput('vsix-path'),
        extensionVersion: platform.getInput('extension-version'),
        manifestGlobs: platform.getDelimitedInput('manifest-file', '\n'),
        timeoutMinutes: timeoutMinutesInput ? parseInt(timeoutMinutesInput, 10) : undefined,
        pollingIntervalSeconds: pollingIntervalSecondsInput
            ? parseInt(pollingIntervalSecondsInput, 10)
            : undefined,
    }, auth, tfxManager, platform);
    if (result.status !== 'success') {
        throw new Error(`Validation failed with status: ${result.status}`);
    }
}
async function runWaitForInstallation(platform, auth) {
    const expectedTasksInput = platform.getInput('expected-tasks');
    let expectedTasks;
    if (expectedTasksInput) {
        try {
            expectedTasks = JSON.parse(expectedTasksInput);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const wrappedError = new Error(`Failed to parse expected-tasks: ${errorMessage}`);
            wrappedError.cause = error;
            throw wrappedError;
        }
    }
    const result = await waitForInstallation({
        publisherId: platform.getInput('publisher-id'),
        extensionId: platform.getInput('extension-id'),
        accounts: platform.getDelimitedInput('accounts', '\n', true),
        expectedTasks,
        manifestFiles: platform.getDelimitedInput('manifest-file', '\n'),
        vsixPath: platform.getInput('vsix-path'),
        timeoutMinutes: parseInt(platform.getInput('timeout-minutes') || '10'),
        pollingIntervalSeconds: parseInt(platform.getInput('polling-interval-seconds') || '30'),
    }, auth, platform);
    if (!result.success) {
        throw new Error(`Verification failed - not all tasks are available`);
    }
}
// Run the action
void run();
//# sourceMappingURL=main.js.map