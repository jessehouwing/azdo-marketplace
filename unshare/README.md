# Unshare Azure DevOps Extension

Unshare an Azure DevOps extension from specific organizations.

## Usage

`accounts` accepts organization names and the URL formats `https://dev.azure.com/ORG` and `https://ORG.visualstudio.com`. URL inputs are normalized to organization names before execution.

### Unshare from Single Organization

```yaml
- uses: jessehouwing/azdo-marketplace/unshare@v6.1.2
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'old-org'
```

### Unshare from Multiple Organizations

```yaml
- uses: jessehouwing/azdo-marketplace/unshare@v6.1.2
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: |
      old-org-1
      old-org-2
      old-org-3
```

### Unshare Using VSIX Identity Fallback

```yaml
- uses: jessehouwing/azdo-marketplace/unshare@v6.1.2
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    vsix-file: ${{ steps.package.outputs.vsix-file }}
    accounts: |
      old-org-1
      old-org-2
```

### Unshare Using Manifest Identity Fallback from a Subfolder

```yaml
- uses: jessehouwing/azdo-marketplace/unshare@v6.1.2
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    working-directory: './extension'
    manifest-file: 'vss-extension.json'
    accounts: 'old-org'
```

### With OIDC Authentication

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: jessehouwing/azdo-marketplace/unshare@v6.1.2
  with:
    auth-type: 'oidc'
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'old-org'
```

## Inputs

### Required Inputs

- `accounts`: Organizations to unshare from (newline-separated)
- `token`: Personal Access Token (required when auth-type is `pat`)

Identity (choose one):

- `publisher-id` + `extension-id`
- `manifest-file` (with optional `working-directory`) as a fallback source for identity metadata
- `vsix-file` (fallback source for identity metadata)

OR

- `auth-type: oidc`: Use OIDC authentication (requires `azure/login` action first)

### Optional Inputs

#### Authentication

- `auth-type`: Authentication type (`pat` or `oidc`, default: `pat`)
- `token`: Personal Access Token (required when auth-type is `pat`)

#### TFX Configuration

- `tfx-version`: Version of tfx-cli to use (default: `built-in`; bundled JS entrypoint, no `.bin` shim fallback)

#### Identity Fallback

- `manifest-file`: Manifest path(s) used to infer `publisher-id` and `extension-id` when omitted
- `working-directory`: Base directory for `manifest-file` when manifests live in a subfolder
- `vsix-file`: Path to VSIX file used to infer `publisher-id` and `extension-id` when omitted

## Outputs

None

## Example: Unshare on Workflow Dispatch

```yaml
name: Unshare Extension

on:
  workflow_dispatch:
    inputs:
      organization:
        description: 'Organization to unshare from'
        required: true

jobs:
  unshare:
    runs-on: ubuntu-latest
    steps:
      - uses: jessehouwing/azdo-marketplace/unshare@v6.1.2
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
          accounts: ${{ github.event.inputs.organization }}
```

## GitHub Marketplace sample

```yaml
- uses: jessehouwing/azdo-marketplace/unshare@v6.1.2
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    accounts: old-customer-org
```

## GitHub Marketplace inputs

- `auth-type`: Selects authentication mode (`pat`, `basic`, or `oidc`).
- `token`: Provides PAT/secret token for authenticated unshare operations.
- `username`: Provides username when `auth-type` is `basic`.
- `service-url`: Overrides the Azure DevOps/Marketplace endpoint.
- `tfx-version`: Selects which `tfx-cli` version/source is used; `built-in` uses the bundled JS entrypoint without `.bin` shim fallback, `path` uses `tfx` from PATH.
- `publisher-id`: Identifies the publisher that owns the extension to unshare.
- `extension-id`: Identifies the extension to unshare.
- `vsix-file`: Provides VSIX-based identity fallback when publisher/extension IDs are omitted.
- `manifest-file`: Provides manifest-based identity fallback when publisher/extension IDs are omitted.
- `working-directory`: Sets the base path used to resolve `manifest-file` in subfolder-based layouts.
- `accounts`: Lists organizations/accounts to remove extension access from.

## GitHub Marketplace outputs

- No outputs: success/failure indicates whether unsharing completed.

## See Also

- [Share](../share) - Share extension with organizations
- [Main Action](../) - All-in-one action with all commands
