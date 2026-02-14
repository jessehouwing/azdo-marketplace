# Technical Analysis: Why azure-pipelines-tasks-azure-arm-rest Cannot Be Used in GitHub Actions

## Question

Can we leverage the `azure-pipelines-tasks-azure-arm-rest` library for OIDC in both Azure Pipelines and GitHub Actions?

## Answer

**No.** The library is deeply integrated with Azure Pipelines infrastructure and cannot work in GitHub Actions.

## Evidence from Source Code

### 1. Azure Pipelines-Specific Variables

The library's `getFederatedToken()` method (azure-arm-common.js:392-417) requires these Azure Pipelines variables:

```javascript
getFederatedToken() {
    return __awaiter(this, void 0, void 0, function* () {
        const projectId = tl.getVariable('System.TeamProjectId');
        const hub = tl.getVariable('System.HostType');
        const planId = tl.getVariable('System.PlanId');
        const jobId = tl.getVariable('System.JobId');
        let uri = tl.getVariable('System.CollectionUri');
        if (!uri) {
            uri = tl.getVariable('System.TeamFoundationServerUri');
        }
        const token = ApplicationTokenCredentials.getSystemAccessToken();
        // ...
    });
}
```

These variables **only exist in Azure Pipelines**:
- `System.TeamProjectId` - Azure DevOps project GUID
- `System.PlanId` - Pipeline execution plan ID  
- `System.JobId` - Job execution ID
- `System.CollectionUri` - Azure DevOps organization URL

GitHub Actions has completely different variables (`GITHUB_*`).

### 2. Azure DevOps WebApi Dependency

The library uses Azure DevOps REST APIs to generate OIDC tokens:

```javascript
const authHandler = getHandlerFromToken(token);
const connection = new WebApi(uri, authHandler);

if (tl.getPipelineFeature("UseOIDCToken2InAzureArmRest")) {
    return azCliUtility.initOIDCToken2(connection, projectId, hub, planId, jobId, this.connectedServiceName);
}

const oidc_token = await ApplicationTokenCredentials.initOIDCToken(
    connection, projectId, hub, planId, jobId, 
    this.connectedServiceName, 3, 2000
);
```

This calls Azure DevOps-specific endpoints that don't exist in GitHub Actions.

### 3. Service Connection Dependency

The entire authentication flow depends on Azure DevOps service connections:

```javascript
let endpointAuthScheme = tl.getEndpointAuthorizationScheme(this._connectedServiceName, true);
let resourceId = tl.getEndpointDataParameter(this._connectedServiceName, 'resourceId', true);
let subscriptionID = tl.getEndpointDataParameter(this._connectedServiceName, 'subscriptionid', true);
let servicePrincipalClientID = tl.getEndpointAuthorizationParameter(this._connectedServiceName, 'serviceprincipalid', true);
```

Service connections are an Azure Pipelines concept that don't exist in GitHub Actions.

### 4. azure-pipelines-task-lib Integration

The library is tightly coupled to `azure-pipelines-task-lib`:

```javascript
const tl = require("azure-pipelines-task-lib/task");

// Used throughout:
tl.getVariable()
tl.getEndpointAuthorizationScheme()
tl.getEndpointDataParameter()
tl.getEndpointUrl()
tl.debug()
tl.loc()
```

This library only works in Azure Pipelines environments.

## What the Library Actually Does

### Not Azure CLI!

The library **does not** call Azure CLI. Instead:

1. **Gets System Access Token**: Uses Azure Pipelines' internal authentication
2. **Calls Azure DevOps APIs**: Requests OIDC token from Azure DevOps
3. **Exchanges for Azure AD Token**: Uses MSAL to get Azure AD access token
4. **Returns Azure AD Token**: For accessing Azure resources

### OIDC Token Flow

```
Azure Pipelines Runtime
    ↓ (System Access Token)
Azure DevOps OIDC Endpoint
    ↓ (Federated Token)
Azure AD via MSAL (@azure/msal-node)
    ↓ (Access Token)
Azure Resource Management APIs
```

This entire flow is Azure-specific and cannot work in GitHub Actions.

## GitHub Actions OIDC

GitHub Actions has a completely different OIDC implementation:

### Token Source

```javascript
import * as core from '@actions/core';

// GitHub generates and signs the token
const token = await core.getIDToken(audience);
```

This token is:
- **Issued by**: `token.actions.githubusercontent.com`
- **Signed by**: GitHub
- **Format**: JWT with GitHub-specific claims
- **Audience**: Configurable (e.g., marketplace URL)

### GitHub OIDC Flow

```
GitHub Actions Runtime
    ↓ (id-token: write permission)
GitHub OIDC Provider
    ↓ (ID Token - JWT)
Target Service (e.g., Marketplace)
    ↓ (validates against GitHub's public keys)
Access Granted
```

This is fundamentally different from Azure Pipelines.

## Token Comparison

### Azure Pipelines OIDC Token

```json
{
  "iss": "https://login.microsoftonline.com/{tenant}/v2.0",
  "aud": "https://management.azure.com/",
  "sub": "service-principal-id",
  "azp": "azure-pipelines-app-id",
  "scp": "user_impersonation",
  // ... Azure AD claims
}
```

### GitHub Actions OIDC Token

```json
{
  "iss": "https://token.actions.githubusercontent.com",
  "aud": "https://marketplace.visualstudio.com",
  "sub": "repo:owner/repo:ref:refs/heads/main",
  "repository": "owner/repo",
  "workflow": "CI",
  // ... GitHub-specific claims
}
```

Completely different token formats and claims.

## Why Two Different Implementations Are Necessary

| Requirement | Azure Pipelines | GitHub Actions |
|-------------|----------------|----------------|
| **Runtime Environment** | Azure Pipelines agent | GitHub Actions runner |
| **System Variables** | `System.*` | `GITHUB_*` |
| **OIDC Provider** | Azure DevOps → Azure AD | GitHub OIDC |
| **Token API** | Azure DevOps WebApi | @actions/core |
| **Authentication Library** | azure-pipelines-tasks-azure-arm-rest | @actions/core |
| **Configuration** | Service Connections | Workflow permissions |
| **Token Issuer** | login.microsoftonline.com | token.actions.githubusercontent.com |

## Attempted Workarounds (Why They Won't Work)

### Attempt 1: Mock Azure Pipelines Variables
**Problem**: Even if we mock the variables, the Azure DevOps WebApi calls would fail because GitHub Actions doesn't have those endpoints.

### Attempt 2: Skip Azure DevOps APIs
**Problem**: The entire library architecture depends on these APIs. Bypassing them means rewriting the library.

### Attempt 3: Use Azure CLI
**Problem**: The library doesn't use Azure CLI. It uses MSAL directly. Azure CLI would require different authentication flows.

### Attempt 4: Adapt GitHub Token
**Problem**: GitHub tokens are JWT format signed by GitHub. Azure AD expects tokens in its own format. They're not interchangeable.

## Correct Solution: Platform-Specific Implementations

Our implementation is the correct and only viable approach:

### Azure Pipelines Implementation

```typescript
// packages/azdo-task/src/auth/azurerm-auth.ts
import { AzureRMEndpoint } from 'azure-pipelines-tasks-azure-arm-rest/azure-arm-endpoint.js';

export async function getAzureRmAuth(connectionName: string): Promise<AuthCredentials> {
  const endpoint = new AzureRMEndpoint(connectionName);
  const azureEndpoint = await endpoint.getEndpoint();
  const token = await azureEndpoint.applicationTokenCredentials.getToken();
  
  return {
    authType: 'pat',
    serviceUrl: 'https://marketplace.visualstudio.com',
    token: token,
  };
}
```

✅ Uses Azure Pipelines infrastructure
✅ Gets Azure AD tokens
✅ Works only in Azure Pipelines

### GitHub Actions Implementation

```typescript
// packages/github-action/src/auth/oidc-auth.ts
import * as core from '@actions/core';

export async function getOidcAuth(audience?: string): Promise<AuthCredentials> {
  const marketplaceUrl = 'https://marketplace.visualstudio.com';
  const aud = audience || marketplaceUrl;
  const token = await core.getIDToken(aud);
  
  return {
    authType: 'pat',
    serviceUrl: marketplaceUrl,
    token: token,
  };
}
```

✅ Uses GitHub Actions infrastructure
✅ Gets GitHub OIDC tokens
✅ Works only in GitHub Actions

### Shared Interface

Both return the same interface, maintaining platform-agnostic core:

```typescript
export interface AuthCredentials {
  authType: 'pat' | 'basic';
  serviceUrl: string;
  token?: string;
  username?: string;
  password?: string;
}
```

## Benefits of Our Approach

1. **Platform-Appropriate**: Each implementation uses the correct platform APIs
2. **Type-Safe**: Both implementations are properly typed
3. **Maintainable**: Changes to one platform don't affect the other
4. **Testable**: Each can be tested independently
5. **Consistent**: Both return the same interface for core library
6. **Future-Proof**: New platforms can be added without modifying existing ones

## Marketplace Token Exchange

Both implementations are "best effort" because:

**Challenge**: Visual Studio Marketplace may not directly accept either token type:
- Azure AD tokens are for Azure resources, not VS Marketplace
- GitHub OIDC tokens are for GitHub-aware services, not VS Marketplace

**Solution**: May require token exchange service:
```
Platform OIDC Token → Exchange Service → Marketplace Token
```

This applies to **both platforms** and is a marketplace configuration issue, not a library choice issue.

## Conclusion

The `azure-pipelines-tasks-azure-arm-rest` library **cannot be used in GitHub Actions** because:

1. ✅ **Architecture**: Deeply integrated with Azure Pipelines infrastructure
2. ✅ **Dependencies**: Requires Azure DevOps WebApi and service connections
3. ✅ **Variables**: Needs Azure Pipelines-specific system variables
4. ✅ **Token Type**: Produces Azure AD tokens, not GitHub OIDC tokens
5. ✅ **Runtime**: Requires Azure Pipelines agent environment

Our implementation with platform-specific libraries is the **correct and only viable approach**.

Both implementations follow the same architectural pattern while respecting platform differences, providing consistency where it matters (interface) while being platform-appropriate where needed (implementation).
