# v6 in Azure Pipelines

This repository ships a **single unified Azure Pipelines task** with operation routing:

- Task: `azdo-marketplace@6`
- Definition: `packages/azdo-task/task.json`
- Entry point: `packages/azdo-task/src/main.ts`

## Minimal usage

```yaml
- task: azdo-marketplace@6
  inputs:
    operation: package
```

Most non-package operations require a service connection (`connectionType` + corresponding connection input).

## Supported operations

- `package`
- `publish`
- `unpublish`
- `share`
- `unshare`
- `install`
- `show`
- `query-version`
- `wait-for-validation`
- `wait-for-installation`

## Common inputs

These appear across multiple operations.

### Authentication

- `connectionType` (`PAT` | `WorkloadIdentity` | `AzureRM` | `Basic`)
- `connectionNamePAT` (when `connectionType = PAT`)
- `connectionNameWorkloadIdentity` (when `connectionType = WorkloadIdentity`)
- `connectionNameAzureRm` (when `connectionType = AzureRM`)
- `connectionNameBasic` (when `connectionType = Basic`)

### Identity and tooling

- `publisherId`
- `extensionId`
- `tfxVersion` (`built-in`, `path`, or npm version spec)

### Manifest / package source

- `manifestFile`
- `localizationRoot`
- `use` (`manifest` or `vsix`) for `package`, `publish`, and `wait-for-installation`
- `vsixFile` (publish from VSIX)

### Overrides and behavior

- `extensionVersion`
- `extensionName`
- `extensionVisibility`
- `extensionPricing`
- `bypassValidation`
- `updateTasksVersion`
- `updateTasksId`

## Command reference (operations and inputs)

> Inputs listed as **Required** are either task-required or practically required to succeed for that operation.

### `package`

Creates a VSIX from manifest files.

- Required:
  - `operation: package`
- Optional:
  - `manifestFile`, `manifestFileJs`, `overridesFile`, `localizationRoot`
  - `publisherId`, `extensionId`
  - `extensionVersion`, `extensionName`, `extensionVisibility`, `extensionPricing`
  - `outputPath`
  - `bypassValidation`
  - `updateTasksVersion`, `updateTasksVersionType`, `updateTasksId`
  - `tfxVersion`

### `publish`

Publishes to Marketplace from manifest or prebuilt VSIX.

- Required:
  - `operation: publish`
  - `connectionType` + matching connection input
  - `use`
  - If `use = vsix`: `vsixFile`
- Optional:
  - `manifestFile`, `manifestFileJs`, `overridesFile`, `localizationRoot`
  - `publisherId`, `extensionId`
  - `extensionVersion`, `extensionName`, `extensionVisibility`, `extensionPricing`
  - `noWaitValidation`
  - `bypassValidation`
  - `updateTasksVersion`, `updateTasksId`
  - `tfxVersion`

### `unpublish`

Removes an extension from Marketplace.

- Required:
  - `operation: unpublish`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
- Optional:
  - `tfxVersion`

### `share`

Shares a private extension with organizations.

- Required:
  - `operation: share`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
  - `accounts` (newline-separated)
- Optional:
  - `tfxVersion`

### `unshare`

Revokes sharing from organizations.

- Required:
  - `operation: unshare`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
  - `accounts` (newline-separated)
- Optional:
  - `tfxVersion`

### `install`

Installs extension to one or more Azure DevOps organizations.

- Required:
  - `operation: install`
  - `connectionType` + matching connection input
  - `accounts` (newline-separated)
  - `publisherId`, `extensionId`
- Optional:
  - `extensionVersion`
  - `tfxVersion`

### `show`

Fetches extension metadata.

- Required:
  - `operation: show`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
- Optional:
  - none
  - `tfxVersion`

### `query-version`

Queries current Marketplace version and optionally increments it.

- Required:
  - `operation: query-version`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
- Optional:
  - `versionAction` (`None`, `Major`, `Minor`, `Patch`)
  - `extensionVersionOverride` (variable name)
  - `setBuildNumber`
  - `tfxVersion`

### `wait-for-validation`

Polls Marketplace validation result.

- Required:
  - `operation: wait-for-validation`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
- Optional:
  - `vsixFile`
  - `maxRetries`, `minTimeout`, `maxTimeout`
  - `tfxVersion`

### `wait-for-installation`

Verifies tasks are available after install.

- Required:
  - `operation: wait-for-installation`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
  - `accounts`
- Optional:
  - task expectations via one of:
    - `expectedTasks` (JSON)
    - `manifestFile`
    - `vsixFile`
  - `timeoutMinutes`, `pollingIntervalSeconds`
  - `tfxVersion`

## Outputs

The task exposes output variables including:

- `extension.outputPath`
- `extension.metadata`
- `extension.proposedVersion`
- `extension.currentVersion`
- `extension.published`
- `extension.shared`
- `extension.unshared`
- `extension.installed`
- `extension.waitForValidation`
- `extension.waitForInstallation`

Compatibility outputs still set by core commands:

- `Extension.OutputPath`
- `Extension.Version`

## Example: package + publish

```yaml
steps:
  - task: azdo-marketplace@6
    name: packageExt
    inputs:
      operation: package
      outputPath: $(Build.ArtifactStagingDirectory)

  - task: azdo-marketplace@6
    inputs:
      operation: publish
      connectionType: PAT
      connectionNamePAT: MyMarketplaceConnection
      use: vsix
      vsixFile: $(packageExt.Extension.OutputPath)
```
