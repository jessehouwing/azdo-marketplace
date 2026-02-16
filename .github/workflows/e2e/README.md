# E2E Workflows

End-to-end test workflows for comprehensive validation of Azure DevOps Extension Tasks.

## Overview

These workflows test real-world scenarios that unit and integration tests cannot cover:
- OIDC authentication with Azure
- Real marketplace interactions
- Real Azure DevOps organization operations
- Cross-platform compatibility
- Different tfx-cli version modes

## Workflows

### 1. `oidc-auth.yml` - OIDC Authentication Testing
**Purpose:** Validate GitHub Actions OIDC integration with Azure

**Tests:**
- Azure login via OIDC
- Package operation
- Show operation with OIDC
- Publish operation with OIDC
- Share operation with OIDC
- Install operation with OIDC

**Required Secrets:**
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `E2E_PUBLISHER_ID`
- `E2E_EXISTING_EXTENSION_ID`

**Trigger:** Manual or workflow call

### 2. `marketplace-operations.yml` - Marketplace Operations
**Purpose:** Test all marketplace-related operations

**Tests:**
- Package (main action + composite)
- Show (main action + composite)
- Query Version (main action + composite)
- Publish (main action VSIX mode + composite manifest mode)
- Unpublish (main action + composite)

**Required Secrets:**
- `MARKETPLACE_TOKEN`
- `E2E_PUBLISHER_ID`
- `E2E_EXISTING_EXTENSION_ID`

**Trigger:** Manual or workflow call

### 3. `org-operations.yml` - Organization Operations
**Purpose:** Test Azure DevOps organization-level operations

**Tests:**
- Share (main action + composite)
- Install (main action + composite)
- Wait for Installation (main action + composite)
- Unshare (main action + composite)

**Required Secrets:**
- `MARKETPLACE_TOKEN`
- `E2E_PUBLISHER_ID`

**Required Input:**
- `test-organization` - Azure DevOps org URL or name

**Trigger:** Manual or workflow call

### 4. `pre-release-validation.yml` - Comprehensive Pre-Release Validation
**Purpose:** Complete validation before releasing new versions

**Tests:**
- All package operations
- All marketplace operations
- Publish + wait for validation
- OIDC authentication (optional)
- Organization operations (optional)
- Cleanup (unpublish test extensions)

**Required Secrets:**
- `MARKETPLACE_TOKEN`
- `E2E_PUBLISHER_ID`
- `E2E_EXISTING_EXTENSION_ID`
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (for OIDC)

**Optional Inputs:**
- `test-organization` - For org operation tests
- `skip-org-tests` - Skip org tests
- `use-oidc` - Enable OIDC testing

**Trigger:** Manual (recommended before releases)

### 5. `tfx-version-modes.yml` - TFX Version Modes
**Purpose:** Test different tfx-cli installation modes

**Tests:**
- Built-in mode (bundled tfx-cli)
- PATH mode (system tfx-cli)
- Version spec mode (specific version from npm)
- Cross-platform (Ubuntu, Windows, macOS)

**Required Secrets:** None (package-only tests)

**Trigger:** Manual or workflow call

## Quick Start

### Minimum Setup for Pre-Release Testing

1. **Add GitHub Secrets:**
   ```
   E2E_PUBLISHER_ID=your-private-publisher
   MARKETPLACE_TOKEN=your-pat-with-marketplace-scopes
   E2E_EXISTING_EXTENSION_ID=any-existing-extension
   ```

2. **Run Pre-Release Validation:**
   - Go to Actions tab
   - Select "E2E - Pre-Release Validation"
   - Click "Run workflow"
   - Wait for completion (5-10 minutes)

### Full Setup for All Tests

Add all secrets mentioned above, including:
- Azure credentials for OIDC
- Test organization for org operations

## Operation Coverage

All 10 operations are tested:

| Operation | Main Action | Composite | Workflows |
|-----------|-------------|-----------|-----------|
| package | ✅ | ✅ | All |
| publish | ✅ | ✅ | Marketplace, Pre-release, OIDC |
| unpublish | ✅ | ✅ | Marketplace, Pre-release |
| share | ✅ | ✅ | Org ops, Pre-release, OIDC |
| unshare | ✅ | ✅ | Org ops, Pre-release |
| install | ✅ | ✅ | Org ops, Pre-release, OIDC |
| show | ✅ | ✅ | Marketplace, Pre-release, OIDC |
| query-version | ✅ | ✅ | Marketplace, Pre-release |
| wait-for-validation | ✅ | ✅ | Pre-release |
| wait-for-installation | ✅ | ✅ | Org ops, Pre-release |

## Authentication Coverage

| Auth Type | Workflows |
|-----------|-----------|
| PAT | All workflows (default) |
| OIDC | oidc-auth.yml, pre-release-validation.yml |
| Basic Auth | Not tested (requires on-prem server) |

## TFX Version Coverage

| TFX Mode | Workflow |
|----------|----------|
| built-in | tfx-version-modes.yml |
| path | tfx-version-modes.yml |
| version spec | tfx-version-modes.yml |

## Platform Coverage

| Platform | Workflow |
|----------|----------|
| Ubuntu | All workflows |
| Windows | tfx-version-modes.yml |
| macOS | tfx-version-modes.yml |

## Best Practices

### When to Run

- **Pre-Release Validation:** Before every release
- **OIDC Auth:** After auth-related changes
- **Marketplace Ops:** After marketplace integration changes
- **Org Ops:** After organization operation changes
- **TFX Modes:** After tfx-cli or bundling changes

### Test Data

- Use private extensions to avoid marketplace clutter
- Use unique extension IDs (include run number)
- Clean up test extensions (unpublish after tests)
- Use separate test organizations

### Handling Failures

1. Check workflow logs for detailed errors
2. Verify secrets are configured correctly
3. Ensure PAT has required scopes
4. Check service principal setup for OIDC
5. Verify organization permissions
6. Re-run if timing issues (marketplace validation)

## Artifacts

Each workflow uploads artifacts:
- VSIX packages created during tests
- Retention: 7-30 days
- Download from workflow run page

## Related Documentation

- [Full E2E Testing Documentation](../../docs/e2e-testing.md)
- [Quick Reference Guide](../../docs/e2e-testing-quick-reference.md)
- [OIDC Setup](../../docs/authentication-and-oidc.md)
- [Test Fixtures](../e2e-test-fixtures/README.md)

## Support

Issues with E2E tests?
1. Review this README
2. Check full documentation
3. Review workflow logs
4. Open GitHub issue with workflow run link
