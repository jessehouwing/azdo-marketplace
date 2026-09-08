# Build provenance and attestation

Every release of this project produces signed, verifiable **build provenance
attestations** using GitHub's [artifact attestations][gh-attestations]
(Sigstore, keyless, backed by the release workflow's OIDC identity). Two
artifacts are attested per release:

| Artifact              | What it is                                                                                                    | Attested subject                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| VSIX                  | The Azure DevOps extension published to the Visual Studio Marketplace                                         | The packaged `.vsix` file itself                               |
| GitHub Action `dist/` | The committed bundle at `packages/github-action/dist/` that `uses: jessehouwing/azdo-marketplace@vX` executes | A single deterministic `git archive` tarball of that directory |

The Azure Pipelines task bundle (`packages/azdo-task/dist/`) is not committed
to the repository and has no standalone distribution channel — it ships only
**inside** the VSIX, so it is covered transitively by the VSIX attestation.

[gh-attestations]: https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds

## How the attestations are produced (release workflow)

Both attestations are created in the `prepare-release` job of
[`.github/workflows/release.yml`](../.github/workflows/release.yml) using
[`actions/attest-build-provenance`][attest-action]. The job runs with:

```yaml
permissions:
  id-token: write # Sigstore keyless signing via GitHub OIDC
  attestations: write # store the attestation with GitHub
  contents: write # push the release branch
```

[attest-action]: https://github.com/actions/attest-build-provenance

### 1. VSIX

Attested immediately after `Package Azure DevOps extension` produces the
`.vsix`:

```yaml
- name: Attest build provenance (VSIX)
  uses: actions/attest-build-provenance@v4.0.0
  with:
    subject-path: ${{ steps.package.outputs.vsix-file }}
```

All content-modifying steps (version bump, format, lint, bundle) run _before_
packaging, so the attested digest is exactly the file that is uploaded as a
workflow artifact and later published to the Marketplace — the file passes
through `actions/upload-artifact`/`download-artifact` unmodified.

### 2. GitHub Action `dist/`

`packages/github-action/dist/` contains ~8,600 committed files (the bundle
plus its pinned runtime `node_modules`). That exceeds the per-file subject
limits of `attest-build-provenance`, and `gh attestation verify` verifies one
file per invocation — so instead of attesting every file, the release
workflow attests **one deterministic tarball** of the directory, created
_after_ the release commit is pushed:

```yaml
- name: Create deterministic GitHub Action dist/ archive
  shell: bash
  run: git archive --format=tar --output "$RUNNER_TEMP/github-action-dist.tar" HEAD packages/github-action/dist

- name: Attest build provenance (GitHub Action dist/)
  uses: actions/attest-build-provenance@v4.0.0
  with:
    subject-path: ${{ runner.temp }}/github-action-dist.tar
```

Why `git archive` works as a stable subject:

- Its output depends **only on the commit**: blob contents and the commit
  timestamp. Working-tree state, line-ending settings, platform, and archive
  creation time do not affect the bytes.
- Anyone who checks out the same commit and runs the **identical command**
  gets a byte-identical tarball, and therefore the same SHA-256 digest —
  which is what makes independent verification possible (see below).
- Because the step runs after `Commit and push changes`, the attested digest
  corresponds to the exact commit that gets tagged `vX.Y.Z`.

## How the attestations are verified

### In the release pipeline itself

- `publish-production` and `create-release` each run
  `gh attestation verify "$VSIX_FILE" --repo jessehouwing/azdo-marketplace`
  on the downloaded artifact **before** their irreversible step (Marketplace
  publish, GitHub release creation). The two jobs run in parallel, so each
  verifies independently to avoid a TOCTOU gap.
- The dispatched test workflow
  [`release-test-github-actions.yml`](../.github/workflows/release-test-github-actions.yml)
  regenerates the `git archive` tarball from its own checkout of the release
  branch and verifies it against the attestation before exercising the
  action — proving the code it is about to run is exactly what
  `prepare-release` built and attested.

### Verifying the VSIX yourself

Download the `.vsix` from the GitHub release (or from the Marketplace) and
run (requires the [GitHub CLI](https://cli.github.com/), any authenticated
user):

```bash
gh attestation verify jessehouwing.azdo-marketplace-X.Y.Z.vsix \
  --repo jessehouwing/azdo-marketplace
```

A successful verification proves the file was built by this repository's
`release.yml` workflow at a specific commit, and has not been modified since.
The output includes the workflow ref, the commit SHA, and the trigger — you
can cross-check the SHA against the `vX.Y.Z` tag.

> Note: the Marketplace itself does not re-serve attestations; the digest of
> the published VSIX matches the attested one as long as the file content is
> identical. The GitHub release asset is the canonical attested artifact.

### Verifying the GitHub Action yourself

Check out the tag you consume, recreate the deterministic tarball with the
**exact same command** the release workflow used, and verify it:

```bash
git clone https://github.com/jessehouwing/azdo-marketplace --branch vX.Y.Z --depth 1
cd azdo-marketplace
git archive --format=tar --output github-action-dist.tar HEAD packages/github-action/dist
gh attestation verify github-action-dist.tar --repo jessehouwing/azdo-marketplace
```

Any deviation in the command (different format, different path, `HEAD`
pointing at another commit) produces a different digest and verification
fails — as does any tampering with the `dist/` contents at that tag.

## What this does and does not prove

- ✅ The artifact was built by `release.yml` in this repository, at a known
  commit, on GitHub-hosted runners — not on a maintainer's machine.
- ✅ The artifact has not been altered since it was attested.
- ❌ It is **not** an OPC/Authenticode VSIX signature: Visual Studio, `tfx`,
  and enterprise policy engines do not read Sigstore attestations. Embedded
  OPC XML-DSig signing of the VSIX (via Microsoft's `sign` CLI + Azure
  Trusted Signing) is planned but deferred until a Trusted Signing account
  exists; it would complement, not replace, these attestations.

## Browsing attestations

All attestations for this repository are listed at
<https://github.com/jessehouwing/azdo-marketplace/attestations>.
