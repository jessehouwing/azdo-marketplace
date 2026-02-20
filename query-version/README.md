# Query Azure DevOps Extension Version

Query an extension version from Visual Studio Marketplace and optionally increment it.

## Usage

```yaml
- uses: jessehouwing/azdo-marketplace/query-version@v6
  id: query
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    version-action: 'Patch'

- run: |
  echo "Current version: ${{ steps.query.outputs.current-version }}"
  echo "Proposed version: ${{ steps.query.outputs.proposed-version }}"
```

## Version Actions

- `None`: Keep the latest marketplace version
- `Major`: Increment major and reset minor/patch
- `Minor`: Increment minor and reset patch
- `Patch`: Increment patch

## Override Behavior

Use `extension-version-override` to point to an env var that contains a version. If present, that value is used instead of marketplace query.

## Outputs

- `current-version`: Current marketplace version before version action
- `proposed-version`: Proposed version after applying version action

## GitHub Marketplace sample

```yaml
- uses: jessehouwing/azdo-marketplace/query-version@v6
  id: query
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    version-action: Patch

- run: echo "Current: ${{ steps.query.outputs.current-version }} -> Next: ${{ steps.query.outputs.proposed-version }}"
```

## GitHub Marketplace inputs

- `auth-type`: Selects authentication mode (`pat`, `basic`, or `oidc`).
- `token`: Provides PAT/secret token for authenticated query operations.
- `username`: Provides username when `auth-type` is `basic`.
- `service-url`: Overrides the Azure DevOps/Marketplace endpoint.
- `tfx-version`: Selects which `tfx-cli` version/source is used; `built-in` uses the bundled JS entrypoint, `path` uses `tfx` from PATH.
- `publisher-id`: Identifies the publisher that owns the extension to query.
- `extension-id`: Identifies the extension to query.
- `version-action`: Selects version increment strategy (`None`, `Major`, `Minor`, `Patch`).
- `extension-version-override`: Names an environment variable containing an explicit version.

## GitHub Marketplace outputs

- `proposed-version`: Returns the computed version after applying `version-action`.
- `current-version`: Returns the current marketplace version before increment logic.

## See Also

- [Show](../show) - Query full extension metadata
- [Publish](../publish) - Publish extension
- [Main Action](../) - All-in-one action
