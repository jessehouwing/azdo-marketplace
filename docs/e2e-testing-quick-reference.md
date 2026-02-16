# E2E Testing Quick Reference

Quick reference for running end-to-end tests before releases.

## Quick Start

### Minimum Setup

1. **Create GitHub Secrets:**
   ```
   E2E_PUBLISHER_ID=your-private-publisher
   MARKETPLACE_TOKEN=your-pat-with-marketplace-scope
   E2E_EXISTING_EXTENSION_ID=any-extension-you-can-query
   ```

2. **Run Pre-Release Validation:**
   - Go to Actions → E2E - Pre-Release Validation
   - Click "Run workflow"
   - Leave inputs as defaults
   - Click "Run workflow"

3. **Wait for completion** (5-10 minutes)

## Secrets Reference

### Required (for basic tests)
- `E2E_PUBLISHER_ID` - Your test publisher ID
- `MARKETPLACE_TOKEN` - PAT with these scopes:
  - ✅ Marketplace (Publish)
  - ✅ Marketplace (Manage)
  - ✅ Marketplace (Read)
  - ✅ Extensions (Read and Manage)
  - ✅ Agent Pools (Read)
- `E2E_EXISTING_EXTENSION_ID` - Any extension for show/query tests

### Optional (for advanced tests)
- `AZURE_CLIENT_ID` - For OIDC testing
- `AZURE_TENANT_ID` - For OIDC testing
- `AZURE_SUBSCRIPTION_ID` - For OIDC testing

## Test Workflows

### 1. Pre-Release Validation (Recommended)
**File:** `.github/workflows/e2e/pre-release-validation.yml`

**What it does:**
- ✅ Package (main + composite)
- ✅ Show (main + composite)
- ✅ Query Version (main + composite)
- ✅ Publish (main + composite)
- ✅ Wait for Validation (main + composite)
- ✅ Cleanup (unpublish test extensions)

**When to run:** Before every release

**Inputs:**
- `test-organization` (optional) - For org operation tests
- `skip-org-tests` (optional) - Skip org tests if no test org
- `use-oidc` (optional) - Test OIDC auth

### 2. OIDC Authentication
**File:** `.github/workflows/e2e/oidc-auth.yml`

**What it does:**
- ✅ OIDC token acquisition
- ✅ Show with OIDC
- ✅ Publish with OIDC
- ✅ Share with OIDC
- ✅ Install with OIDC

**When to run:** When testing OIDC changes

**Requires:** Azure service principal setup

### 3. Marketplace Operations
**File:** `.github/workflows/e2e/marketplace-operations.yml`

**What it does:**
- ✅ Package
- ✅ Show
- ✅ Query Version
- ✅ Publish
- ✅ Unpublish

**When to run:** When testing marketplace interactions

### 4. Organization Operations
**File:** `.github/workflows/e2e/org-operations.yml`

**What it does:**
- ✅ Share
- ✅ Install
- ✅ Wait for Installation
- ✅ Unshare

**When to run:** When testing org-level operations

**Requires:** Test organization input

## Operation Coverage

| Operation | Tested Via | Auth Required | Notes |
|-----------|-----------|---------------|-------|
| package | All workflows | No | Always works |
| publish | Pre-release, Marketplace | Yes | Tests VSIX + manifest |
| unpublish | Pre-release, Marketplace | Yes | Cleanup |
| share | OIDC, Org ops | Yes | Needs publisher |
| unshare | Org ops | Yes | Cleanup |
| install | OIDC, Org ops | Yes | Needs org admin |
| show | All | Yes | Read-only |
| query-version | Pre-release, Marketplace | Yes | Read-only |
| wait-for-validation | Pre-release | Yes | After publish |
| wait-for-installation | Org ops | Yes | After install |

## Common Issues

### "No MARKETPLACE_TOKEN secret"
**Fix:** Add PAT token to repository secrets

### "Extension already exists"
**Fix:** Wait for cleanup or manually unpublish via marketplace portal

### OIDC fails with "Invalid token"
**Fix:** Verify service principal setup and federated credentials

### "Permission denied" on org operations
**Fix:** Ensure you're org admin and token has correct scopes

### Wait operations timeout
**Fix:** Increase timeout or wait longer between operations

## Pre-Release Checklist

Before releasing a new version:

- [ ] Run "E2E - Pre-Release Validation" workflow
- [ ] Verify all jobs pass (green checkmarks)
- [ ] Check artifacts were created
- [ ] Verify cleanup completed (extensions unpublished)
- [ ] Review any warnings in logs
- [ ] Test with real extension if major changes

## Test Artifacts

Each workflow uploads artifacts:

- **Artifact name:** `prerelease-packages`, `e2e-oidc-vsix`, etc.
- **Contents:** Generated .vsix files
- **Retention:** 7-30 days
- **Use:** Download to inspect generated packages

## Manual Cleanup

If tests fail and leave extensions published:

1. Go to https://marketplace.visualstudio.com/manage/publishers/YOUR_PUBLISHER_ID
2. Find test extensions (e.g., `prerelease-test-main`)
3. Click "..." → "Unpublish"
4. Confirm unpublish

## Links

- [Full E2E Testing Documentation](./e2e-testing.md)
- [OIDC Setup Guide](./authentication-and-oidc.md)
- [GitHub Actions Usage](./github-actions.md)

## Support

Issues? Check:
1. This guide
2. Full documentation (`docs/e2e-testing.md`)
3. Workflow logs (detailed errors)
4. Open GitHub issue with workflow run link
