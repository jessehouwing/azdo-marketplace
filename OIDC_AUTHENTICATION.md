# OIDC Authentication in v6

This document explains the OIDC (OpenID Connect) authentication implementations for both Azure Pipelines and GitHub Actions.

## Overview

Both platform adapters implement OIDC authentication using their respective platform's OIDC capabilities, following a similar architectural pattern while respecting platform-specific technologies.

## Architecture Pattern

Both implementations follow the same pattern:
1. Get OIDC token from the platform
2. Format as `AuthCredentials` with token
3. Use token for marketplace operations
4. Document requirements and limitations

## Azure Pipelines OIDC

**Implementation**: `packages/azdo-task/src/auth/azurerm-auth.ts`

**Library**: `azure-pipelines-tasks-azure-arm-rest` (v3.267.0+)

**How it works**:
```typescript
// Uses Azure RM endpoint for workload identity federation
const endpoint = new AzureRMEndpoint(connectionName);
const azureEndpoint = await endpoint.getEndpoint();
const token = await azureEndpoint.applicationTokenCredentials.getToken();
```

**Requirements**:
- Azure RM service connection configured in Azure DevOps
- Connection must use workload identity federation (OIDC)
- Application must have appropriate permissions

**Usage in task.json**:
```yaml
- task: ExtensionTasks@6
  inputs:
    operation: publish
    connectionType: connectedService:AzureRM
    connectionNameAzureRM: $(AzureRmConnection)
    # ... other inputs
```

**Limitations**:
- Simplified implementation - full marketplace OIDC may require token exchange
- Currently uses Azure AD token directly
- Marketplace configuration may be needed for production use

## GitHub Actions OIDC

**Implementation**: `packages/github-action/src/auth/oidc-auth.ts`

**Library**: `@actions/core` (v1.11.1+)

**How it works**:
```typescript
// Uses GitHub Actions OIDC to get ID token
const token = await core.getIDToken(audience);
```

**Requirements**:
- Workflow must have `id-token: write` permission
- Marketplace may need configuration to accept GitHub OIDC tokens

**Usage in workflow**:
```yaml
jobs:
  publish:
    permissions:
      id-token: write  # Required for OIDC
      contents: read
    steps:
      - uses: jessehouwing/azure-devops-extension-tasks@v6
        with:
          operation: publish
          auth-type: oidc  # Use OIDC instead of PAT
          # token not needed - automatically obtained
          publisher-id: my-publisher
          extension-id: my-extension
```

**Limitations**:
- Best-effort implementation
- Visual Studio Marketplace may require additional configuration
- Token exchange service might be needed for full production support
- If OIDC doesn't work, fall back to PAT authentication

## Comparison

| Feature | Azure Pipelines | GitHub Actions |
|---------|----------------|----------------|
| **Library** | azure-pipelines-tasks-azure-arm-rest | @actions/core |
| **Token Type** | Azure AD Access Token | GitHub ID Token (JWT) |
| **Configuration** | Azure RM Service Connection | Workflow permissions |
| **Platform** | Azure DevOps | GitHub Actions |
| **Status** | Simplified (may need exchange) | Best-effort (may need exchange) |

## Why Different Libraries?

**Question**: Can we use the same library for both platforms?

**Answer**: No, because:
1. **Different Token Providers**:
   - Azure Pipelines: Azure Active Directory (via Azure RM)
   - GitHub Actions: GitHub's OIDC provider

2. **Different APIs**:
   - Azure: `ApplicationTokenCredentials.getToken()`
   - GitHub: `core.getIDToken(audience)`

3. **Different Token Formats**:
   - Azure AD tokens are specific to Azure resources
   - GitHub ID tokens are JWTs signed by GitHub

4. **Platform-Specific Libraries**:
   - `azure-pipelines-tasks-azure-arm-rest` is for Azure DevOps
   - `@actions/core` is for GitHub Actions

## However - Same Pattern!

While we can't use the same library, we **do** use the same architectural pattern:

```typescript
// Both return the same AuthCredentials interface
export async function getAuth(): Promise<AuthCredentials> {
  // 1. Get token from platform-specific source
  const token = await platformSpecificGetToken();
  
  // 2. Return in standard format
  return {
    authType: 'pat',
    serviceUrl: 'https://marketplace.visualstudio.com',
    token: token,
  };
}
```

This allows the core library to remain platform-agnostic while both adapters provide OIDC capabilities in a platform-appropriate way.

## Recommendations

### For Production Use

**Azure Pipelines**:
- ✅ Use Azure RM OIDC if available
- ✅ Falls back to PAT authentication
- ⚠️ May require marketplace configuration

**GitHub Actions**:
- ✅ PAT authentication (recommended, works immediately)
- ⚠️ OIDC authentication (experimental, may need configuration)
- Set `id-token: write` permission if using OIDC

### Migration Path

1. **Start with PAT**: Both platforms support PAT authentication out of the box
2. **Test OIDC**: Try OIDC in non-production environments
3. **Monitor**: Check if marketplace accepts the tokens
4. **Configure**: Work with marketplace team if token exchange is needed

## Future Enhancements

Potential improvements for full OIDC support:
- Token exchange service for marketplace
- Marketplace configuration to accept both Azure AD and GitHub OIDC
- Automatic fallback from OIDC to PAT
- Better error messages for OIDC configuration issues

## Summary

Both platforms now support OIDC authentication using platform-appropriate libraries and following the same architectural pattern. While the implementations differ due to platform-specific requirements, the user experience and core library integration remain consistent.
