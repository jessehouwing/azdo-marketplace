# Patch, download, and verify VSIX provenance

`patch` applies the same VSIX manifest overrides as `publish`, without contacting
Marketplace or requiring credentials, npm, or tfx-cli. The same source bytes and
options produce byte-identical output, including deterministic task IDs when
`update-tasks-id` is enabled. Preserve the original source when comparing repeated
patch runs. Use `output-path` to write the result to a separate directory.

`download-vsix` retrieves a published version (`version: latest` by default). It
uses the usual authentication to query Marketplace metadata, downloads the VSIX
asset without forwarding credentials, and validates the ZIP signature. It fails
when the version or VSIX asset is absent. Downloads preserve the published bytes;
they do not patch, rebuild, or attest them.

The `patch` and `download-vsix` wrappers use GitHub's same-repository `$/`
syntax to run the root action at the same commit, rather than a moving `main`.
Self-hosted runners must be version 2.336.0 or newer. References to `@v6` in
these examples require a release that includes these operations.

## Reproduce the release VSIX integration test

From the repository root in PowerShell, download the latest released VSIX to a
scratch directory in the checkout, then opt in to the integration test:

```powershell
New-Item -ItemType Directory -Force .release-vsix-integration | Out-Null
gh release download --repo jessehouwing/azdo-marketplace --pattern '*.vsix' --dir .release-vsix-integration
$env:RELEASE_VSIX = (Get-ChildItem .release-vsix-integration -Filter '*.vsix' | Select-Object -First 1).FullName
npm test -- --testPathPatterns release-vsix-integration --runInBand
Remove-Item Env:RELEASE_VSIX
Remove-Item -Recurse -Force .release-vsix-integration
```

The test substitutes a public metadata lookup for authenticated `tfx show`, then
performs a live unauthenticated Marketplace asset download and compares its digest
with the release asset. Publishing is mocked: no upload occurs. It also checks
deterministic patch output and preserved payloads. The release asset's version must
still be available on Marketplace.

## GitHub Actions: patch before attesting

Grant `contents: read`, `id-token: write`, and `attestations: write` in the workflow.
Starting with a downloaded build artifact:

```yaml
- uses: jessehouwing/azdo-marketplace/patch@v6
  id: patch
  with:
    vsix-file: artifacts/*.vsix
    output-path: preview
    extension-id: my-extension-preview
    extension-visibility: private
    update-tasks-id: 'true'

- uses: actions/attest-build-provenance@v3
  with:
    subject-path: ${{ steps.patch.outputs.vsix-file }}

- uses: jessehouwing/azdo-marketplace/publish@v6
  with:
    use: vsix
    vsix-file: ${{ steps.patch.outputs.vsix-file }}
    token: ${{ secrets.MARKETPLACE_TOKEN }}
```

Publish the attested file **without any editing overrides**. Leave
`update-tasks-version: none` and `update-tasks-id: false` at their publish defaults.
Patching after attestation would change the digest and invalidate verification.

## Retry: verify the existing published artifact

Run this branch only when the exact preview version is already published.
Pin `version` to that release rather than trusting a moving `latest` version.

```yaml
- uses: jessehouwing/azdo-marketplace/download-vsix@v6
  id: download
  with:
    publisher-id: my-publisher
    extension-id: my-extension-preview
    version: '1.2.3'
    output-path: verified-preview
    token: ${{ secrets.MARKETPLACE_TOKEN }}

- name: Verify the original release workflow attestation
  env:
    GH_TOKEN: ${{ github.token }}
    VSIX_FILE: ${{ steps.download.outputs.vsix-file }}
  run: >-
    gh attestation verify "$VSIX_FILE"
    --repo "$GITHUB_REPOSITORY"
    --signer-workflow "$GITHUB_REPOSITORY/.github/workflows/release.yml"
```

Verification must fail the job on a digest or signer mismatch. Do not ignore its
exit code. Do not patch, re-attest, or republish on this branch: that would replace
verification of the original build with a new claim about untrusted bytes.
Continue validation, sharing, and installation using the verified file.

## Azure Pipelines

Both operations are also available through the unified task:

```yaml
- task: azdo-marketplace@6
  name: patch
  inputs:
    operation: patch
    vsixFile: artifacts/*.vsix
    outputPath: preview
    extensionId: my-extension-preview
    extensionVisibility: private
    updateTasksId: true

- task: azdo-marketplace@6
  name: download
  inputs:
    operation: downloadVsix
    connectionType: PAT
    connectionNamePAT: Marketplace
    publisherId: my-publisher
    extensionId: my-extension-preview
    version: '1.2.3'
    outputPath: downloaded-preview
```

Each task exposes `$(patch.vsixFile)` / `$(download.vsixFile)` and the corresponding
`vsixFileName` output. GitHub Actions outputs are `vsix-file` and `vsix-file-name`.
The download selector is `version`, not `extensionVersion` / `extension-version`,
which is a manifest-editing override.
