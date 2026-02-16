# End-to-End Testing Strategy

This document describes the comprehensive end-to-end (E2E) testing strategy for the Azure DevOps Extension Tasks project.

## Overview

E2E tests validate real-world scenarios that are difficult or impossible to test with unit and integration tests alone. These tests interact with actual Azure services, the Visual Studio Marketplace, and Azure DevOps organizations.

## What E2E Tests Cover

### 1. **OIDC Authentication Integration**
- GitHub Actions OIDC → Azure token exchange
- Token acquisition and secret masking
- All operations with OIDC authentication
- Service principal marketplace access

### 2. **Marketplace Operations**
- Package creation from manifests
- Publishing extensions (both manifest and VSIX modes)
- Showing extension metadata
- Querying versions
- Unpublishing extensions
- Marketplace validation workflows

### 3. **Azure DevOps Organization Operations**
- Sharing extensions with organizations
- Installing extensions to organizations
- Waiting for task availability after installation
- Unsharing extensions from organizations

### 4. **Both Action Interfaces**
- **Main action** (root `action.yml` with `operation:` parameter)
- **Composite wrappers** (individual operation directories like `/package`, `/publish`, etc.)

## E2E Workflow Files

### Location
All E2E workflows are in `.github/workflows/e2e/`

### Workflows

#### 1. `oidc-auth.yml` - OIDC Authentication Testing
Tests GitHub Actions OIDC integration with Azure.

**What it tests:**
- Azure login with OIDC
- Package operation (no auth required)
- Show operation with OIDC auth
- Publish operation with OIDC auth
- Share operation with OIDC auth
- Install operation with OIDC auth

**Required secrets:**
- `AZURE_CLIENT_ID` - Azure service principal client ID
- `AZURE_TENANT_ID` - Azure tenant ID
- `AZURE_SUBSCRIPTION_ID` - Azure subscription ID
- `E2E_PUBLISHER_ID` - Your test publisher ID
- `E2E_EXISTING_EXTENSION_ID` - An existing extension for read operations

**Trigger:** Manual (`workflow_dispatch`) or via `workflow_call`

#### 2. `marketplace-operations.yml` - Marketplace Operations
Tests all marketplace-related operations through both main action and composites.

**What it tests:**
- **Package** - Creates VSIX from manifests (main + composite)
- **Show** - Queries extension metadata (main + composite)
- **Query Version** - Gets current and proposed versions (main + composite)
- **Publish** - Publishes extensions in both VSIX and manifest modes (main + composite)
- **Unpublish** - Removes extensions from marketplace (main + composite)

**Required secrets:**
- `MARKETPLACE_TOKEN` - PAT with Marketplace (Publish) scope
- `E2E_PUBLISHER_ID` - Your test publisher ID
- `E2E_EXISTING_EXTENSION_ID` - An existing extension for read operations

**Trigger:** Manual (`workflow_dispatch`) or via `workflow_call`

#### 3. `org-operations.yml` - Organization Operations
Tests operations that interact with Azure DevOps organizations.

**What it tests:**
- **Share** - Shares extension with organizations (main + composite)
- **Install** - Installs extension to organizations (main + composite)
- **Wait for Installation** - Verifies tasks are available (main + composite)
- **Unshare** - Removes sharing (main + composite)

**Required secrets:**
- `MARKETPLACE_TOKEN` - PAT with Marketplace (Publish) and Extensions (Read and Manage) scopes
- `E2E_PUBLISHER_ID` - Your test publisher ID

**Required inputs:**
- `test-organization` - Azure DevOps organization URL or name

**Trigger:** Manual (`workflow_dispatch`) or via `workflow_call`

#### 4. `pre-release-validation.yml` - Comprehensive Pre-Release Validation
Combines all E2E tests into a single validation workflow for pre-release testing.

**What it tests:**
- All package operations
- All marketplace operations
- Publish and wait-for-validation workflow
- OIDC authentication (optional)
- Organization operations (optional)
- Cleanup of test extensions

**Required secrets:**
- `MARKETPLACE_TOKEN` - PAT with full permissions
- `E2E_PUBLISHER_ID` - Your test publisher ID
- `E2E_EXISTING_EXTENSION_ID` - An existing extension
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (for OIDC)

**Optional inputs:**
- `test-organization` - For organization tests
- `skip-org-tests` - Skip organization-specific tests
- `use-oidc` - Enable OIDC authentication testing

**Trigger:** Manual (`workflow_dispatch`)

## Test Fixtures

### Sample Extension
Location: `.github/e2e-test-fixtures/sample-extension/`

A minimal but valid Azure DevOps extension with:
- 2 sample tasks (V1 and V2)
- Valid extension manifest
- Minimal task implementations
- Small icon image

This fixture is used by all E2E tests for consistent, reproducible testing.

## Setup Instructions

### Prerequisites

1. **Azure DevOps Publisher Account**
   - Create or use an existing private publisher
   - This will be used for E2E test extensions

2. **Personal Access Token (PAT)**
   - Create a PAT at https://dev.azure.com/_usersSettings/tokens
   - Required scopes:
     - Marketplace (Publish) - for publish, share operations
     - Marketplace (Manage) - for unpublish operations
     - Marketplace (Read) - for show, query-version operations
     - Extensions (Read and Manage) - for install operations
     - Agent Pools (Read) - for wait-for-installation

3. **Test Azure DevOps Organization** (optional)
   - Required for organization operations tests
   - You must be an administrator
   - Used for share/install/unshare operations

4. **Azure Service Principal** (for OIDC tests)
   - Create app registration in Azure Entra ID
   - Configure federated credentials for GitHub Actions
   - Add service principal to publisher as member
   - See `docs/authentication-and-oidc.md` for detailed setup

### GitHub Secrets Configuration

Add these secrets to your GitHub repository:

#### Required for all tests:
```
E2E_PUBLISHER_ID=your-publisher-id
MARKETPLACE_TOKEN=your-pat-token
E2E_EXISTING_EXTENSION_ID=some-existing-extension-id
```

#### For OIDC tests:
```
AZURE_CLIENT_ID=your-client-id
AZURE_TENANT_ID=your-tenant-id
AZURE_SUBSCRIPTION_ID=your-subscription-id
```

### Running E2E Tests

#### Run Individual Workflows

1. **OIDC Authentication Test**
   ```
   GitHub Actions UI → e2e-oidc-auth → Run workflow
   ```

2. **Marketplace Operations Test**
   ```
   GitHub Actions UI → e2e-marketplace-operations → Run workflow
   ```

3. **Organization Operations Test**
   ```
   GitHub Actions UI → e2e-org-operations → Run workflow
   Input: test-organization = your-org-name
   ```

#### Run Pre-Release Validation

Before releasing a new version:

```
GitHub Actions UI → e2e-pre-release-validation → Run workflow
Inputs:
  - test-organization: your-test-org (optional)
  - skip-org-tests: false (optional)
  - use-oidc: false (optional)
```

This runs a comprehensive suite of all E2E tests.

## Operation Coverage Matrix

| Operation | Main Action | Composite | Auth Types | Special Notes |
|-----------|-------------|-----------|------------|---------------|
| package | ✅ | ✅ | None | No auth required |
| publish | ✅ | ✅ | PAT, OIDC | Tests both VSIX and manifest modes |
| unpublish | ✅ | ✅ | PAT, OIDC | Cleanup operation |
| share | ✅ | ✅ | PAT, OIDC | Requires publisher access |
| unshare | ✅ | ✅ | PAT, OIDC | Cleanup operation |
| install | ✅ | ✅ | PAT, OIDC | Requires org admin |
| show | ✅ | ✅ | PAT, OIDC | Read-only operation |
| query-version | ✅ | ✅ | PAT, OIDC | Tests version incrementing |
| wait-for-validation | ✅ | ✅ | PAT, OIDC | Tests marketplace validation polling |
| wait-for-installation | ✅ | ✅ | PAT, OIDC | Tests task availability polling |

## Best Practices

### When to Run E2E Tests

1. **Before major releases** - Run full pre-release validation
2. **After auth changes** - Run OIDC and marketplace tests
3. **After core changes** - Run marketplace operations tests
4. **On-demand** - For troubleshooting or validation

### Test Data Management

- Use unique extension IDs per test run (e.g., include run number)
- Use private extensions to avoid marketplace clutter
- Clean up test extensions after runs (unpublish)
- Keep test organizations separate from production

### Handling Failures

1. **Check workflow logs** - Detailed error messages in job logs
2. **Verify secrets** - Ensure all required secrets are configured
3. **Check permissions** - Verify PAT scopes and service principal access
4. **Validate setup** - Confirm publisher, organization access
5. **Re-run** - Some operations may fail due to timing (marketplace validation)

## Troubleshooting

### "Extension already exists" error
- Another test run may have published the same extension
- Wait for cleanup or manually unpublish
- Use different extension ID suffix

### OIDC authentication fails
- Verify Azure service principal setup
- Check federated credential configuration
- Ensure service principal is added to publisher
- Review `docs/authentication-and-oidc.md`

### Wait for installation times out
- Tasks may take longer to propagate
- Increase timeout-minutes input
- Verify extension is actually installed
- Check organization permissions

### Marketplace validation fails
- Extension may not meet marketplace requirements
- Check validation errors in marketplace publisher portal
- Review extension manifest for issues
- Some validation may take longer than expected

## Limitations

### What E2E Tests DON'T Cover

- **Basic auth** - Requires on-premises Azure DevOps Server setup
- **Custom service URLs** - Requires private Azure DevOps Server
- **Large extensions** - Tests use minimal fixtures
- **Performance** - Focus is on functionality, not performance
- **All edge cases** - Unit tests better for edge cases

## Future Enhancements

Potential improvements to E2E testing:

1. **Scheduled runs** - Run E2E tests on a schedule (e.g., weekly)
2. **Matrix testing** - Test across multiple Node versions
3. **Performance metrics** - Track operation timing
4. **Extended scenarios** - Test more complex extension structures
5. **Rollback testing** - Test unpublish and republish scenarios
6. **Multi-org testing** - Test across multiple organizations

## Related Documentation

- [Authentication and OIDC Setup](../../docs/authentication-and-oidc.md)
- [GitHub Actions Usage](../../docs/github-actions.md)
- [Contributing Guide](../../docs/contributing.md)
- [Main README](../../README.md)

## Support

If you encounter issues with E2E tests:

1. Check this documentation first
2. Review workflow logs for errors
3. Verify your setup against requirements
4. Open an issue with workflow run link and error details
