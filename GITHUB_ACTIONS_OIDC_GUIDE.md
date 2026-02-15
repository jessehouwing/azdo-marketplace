# GitHub Actions OIDC Authentication Guide

## Overview

This action supports OIDC authentication via the **azure/login pattern**, which uses Azure CLI to retrieve Azure AD tokens after federated authentication.

This approach is based on: https://jessehouwing.net/authenticate-connect-mggraph-using-oidc-in-github-actions/

## Why This Approach?

The Visual Studio Marketplace expects **Azure AD access tokens**. Using the `azure/login` action:

1. ✅ **Federates GitHub OIDC → Azure AD** (handled by azure/login)
2. ✅ **Gets real Azure AD tokens** (via Azure CLI)
3. ✅ **Works with existing Azure infrastructure**
4. ✅ **Standard GitHub Actions pattern**
5. ✅ **No custom token exchange needed**

## Setup

### 1. Azure App Registration

Create an Azure AD App Registration with federated credentials for GitHub:

```bash
# Create app registration
az ad app create --display-name "GitHub Actions Marketplace"

# Get the application (client) ID
APP_ID=$(az ad app list --display-name "GitHub Actions Marketplace" --query "[0].appId" -o tsv)

# Create federated credential for your repository
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "GitHubActionsMarketplace",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

**Note**: Adjust the `subject` to match your repository and branch/environment.

### 2. GitHub Secrets

Add these secrets to your GitHub repository:

- `AZURE_CLIENT_ID` - Application (client) ID from app registration
- `AZURE_TENANT_ID` - Your Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID` - Your Azure subscription ID (any valid subscription)

### 3. Workflow Permissions

Your workflow needs `id-token: write` permission:

```yaml
permissions:
  id-token: write
  contents: read
```

## Usage

### Complete Workflow Example

```yaml
name: Publish Extension

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      # Step 1: Checkout code
      - uses: actions/checkout@v4
      
      # Step 2: Authenticate with Azure using OIDC
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      
      # Step 3: Use our action with OIDC auth
      - name: Publish Extension
        uses: jessehouwing/azure-devops-extension-tasks@v6
        with:
          operation: publish
          auth-type: oidc  # Uses azure/login session
          publisher-id: my-publisher
          extension-id: my-extension
          publish-source: manifest
          root-folder: ./extension
```

### Alternative: PAT Authentication

If OIDC setup is too complex, use PAT authentication:

```yaml
- uses: jessehouwing/azure-devops-extension-tasks@v6
  with:
    operation: publish
    auth-type: pat  # Default
    token: ${{ secrets.MARKETPLACE_PAT }}
    publisher-id: my-publisher
    extension-id: my-extension
```

PAT is simpler but requires storing a secret token.

## How It Works

1. **azure/login** action:
   - Gets GitHub OIDC token (JWT)
   - Federates with Azure AD
   - Authenticates Azure CLI

2. **Our action** (when auth-type: oidc):
   - Calls `az account get-access-token --resource https://marketplace.visualstudio.com`
   - Gets Azure AD access token
   - Uses token for marketplace operations

3. **Marketplace**:
   - Receives proper Azure AD token
   - Works like Azure Pipelines authentication

## Comparison

| Aspect | OIDC (azure/login) | PAT |
|--------|-------------------|-----|
| **Setup** | Complex (Azure app, secrets) | Simple (1 secret) |
| **Security** | Better (short-lived, no stored tokens) | Good (stored token) |
| **Works with** | Azure infrastructure | Any environment |
| **Token type** | Azure AD access token | Personal access token |
| **Recommended for** | Enterprises with Azure | Individual developers |

## Troubleshooting

### Error: "az: command not found"

The azure/login action installs Azure CLI. Make sure you're using it before our action.

### Error: "No accessToken in Azure CLI response"

Azure CLI couldn't get a token. Check:
- azure/login ran successfully
- Your app registration is correct
- Federated credentials match your repo/branch

### Error: "Failed to get Azure AD token"

Common causes:
- azure/login action not run
- Incorrect client-id, tenant-id, or subscription-id
- Federated credential subject doesn't match your workflow

### Still not working?

Use PAT authentication as a fallback:
```yaml
auth-type: pat
token: ${{ secrets.MARKETPLACE_PAT }}
```

## References

- [Jesse Houwing's Blog: OIDC in GitHub Actions](https://jessehouwing.net/authenticate-connect-mggraph-using-oidc-in-github-actions/)
- [GitHub Docs: OIDC with Azure](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-azure)
- [azure/login Action](https://github.com/Azure/login)

## Summary

The OIDC authentication for GitHub Actions:
- ✅ Uses industry-standard azure/login pattern
- ✅ Gets proper Azure AD tokens via Azure CLI  
- ✅ Works with Visual Studio Marketplace
- ✅ Aligns with Azure Pipelines approach
- ✅ No custom token exchange needed

For most users, **PAT authentication is simpler**. Use OIDC if your organization already uses Azure and wants enhanced security with short-lived tokens.
