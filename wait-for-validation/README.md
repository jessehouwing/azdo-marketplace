# Validate Azure DevOps Extension (wait-for-validation)

Validate that an Azure DevOps extension has been successfully processed by the marketplace.

## Usage

### Basic Validation

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-validation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    extension-version: '1.2.3'
```

### With Custom Retry Settings

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-validation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    max-retries: '20'
    min-timeout: '2'
    max-timeout: '30'
```

### Validate Using VSIX Identity Fallback

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-validation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    vsix-path: ${{ steps.package.outputs.vsix-path }}
    max-retries: '15'
```

### With OIDC Authentication

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: jessehouwing/azdo-marketplace/wait-for-validation@v6
  with:
    auth-type: 'oidc'
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
```

## Inputs

### Required Inputs

- `token`: Personal Access Token (required when auth-type is `pat`)

Identity (choose one):

- `publisher-id` + `extension-id`
- `vsix-path` (fallback source for identity metadata)

OR

- `auth-type: oidc`: Use OIDC authentication (requires `azure/login` action first)

### Optional Inputs

#### Authentication

- `auth-type`: Authentication type (`pat` or `oidc`, default: `pat`)
- `token`: Personal Access Token (required when auth-type is `pat`)

#### TFX Configuration

- `tfx-version`: Version of tfx-cli to use (default: `built-in`; bundled JS entrypoint, no `.bin` shim fallback)

#### Validation Options

- `max-retries`: Maximum retry attempts (default: `10`)
- `min-timeout`: Minimum timeout between retries in minutes (default: `1`)
- `max-timeout`: Maximum timeout between retries in minutes (default: `15`)
- `extension-version`: Optional specific extension version to validate (e.g. `1.2.3`)

#### Identity Fallback

- `vsix-path`: Path to VSIX file used to infer `publisher-id` and `extension-id` when omitted

## Outputs

None - Action succeeds if extension is valid, fails otherwise.

## Example: Validate After Publishing

```yaml
name: Publish and Validate Extension

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Publish Extension
        uses: jessehouwing/azdo-marketplace/publish@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          manifest-file: './extension/vss-extension.json'

      - name: Validate Extension
        uses: jessehouwing/azdo-marketplace/wait-for-validation@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
          max-retries: '15'
```

## How It Works

This action polls the marketplace to check if your extension has been successfully validated after publishing. The marketplace validation process can take several minutes, so the action uses exponential backoff with configurable retry settings.

**Retry Logic**:

- Starts with minimum timeout
- Increases timeout exponentially on each retry
- Caps at maximum timeout
- Stops after max-retries attempts

## GitHub Marketplace sample

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-validation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    max-retries: '10'
```

## GitHub Marketplace inputs

- `auth-type`: Selects authentication mode (`pat`, `basic`, or `oidc`).
- `token`: Provides PAT/secret token for authenticated validation checks.
- `username`: Provides username when `auth-type` is `basic`.
- `service-url`: Overrides the Azure DevOps/Marketplace endpoint.
- `tfx-version`: Selects which `tfx-cli` version/source is used; `built-in` uses the bundled JS entrypoint without `.bin` shim fallback, `path` uses `tfx` from PATH.
- `publisher-id`: Identifies the publisher that owns the extension to validate.
- `extension-id`: Identifies the extension to validate.
- `extension-version`: Targets a specific extension version for validation checks.
- `vsix-path`: Provides VSIX-based identity fallback when publisher/extension IDs are omitted.
- `max-retries`: Sets maximum validation retry attempts.
- `min-timeout`: Sets minimum retry delay in minutes.
- `max-timeout`: Sets maximum retry delay in minutes.

## GitHub Marketplace outputs

- No outputs: success/failure indicates whether marketplace validation passed.

## See Also

- [Publish](../publish) - Publish extension (use with no-wait-validation)
- [Wait for Installation](../wait-for-installation) - Verify extension installation
- [Show](../show) - Display extension metadata
- [Main Action](../) - All-in-one action with all commands
