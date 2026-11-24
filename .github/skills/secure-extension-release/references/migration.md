# Release migration reference

Read this alongside the source workflows listed in `../SKILL.md`. This is a set
of implementation requirements and adaptation notes, not a ready-to-run template.

## Release graph and trust boundaries

The source workflow's effective dependency order is:

```text
prepare-release -> validate-documentation-versions -> preview-release
prepare-release + preview-release -> test-azure-pipelines
prepare-release + validate-documentation-versions -> test-github-actions
prepare-release + preview-release + both test jobs -> create-release (draft)
prepare-release + preview-release + both test jobs + draft -> release-approval
approval + successful candidate prerequisites -> publish-production
production + draft + preparation -> publish-github-release
published GitHub release + preparation -> check-semver (second approval)
all required stages -> conditional cleanup
```

Classify the target into one of three supported repository types:

| Published products                     | Expected release shape                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GitHub Actions + Azure Pipelines tasks | Orchestrate in GitHub Actions, retaining both candidate action tests and installed preview task tests                                                                          |
| GitHub Actions only                    | Orchestrate in GitHub Actions; omit Marketplace/installed-task stages, retaining candidate action tests, approval, and immutable GitHub publication                            |
| Azure Pipelines tasks only             | Orchestrate in GitHub Actions or Azure Pipelines; retain Marketplace preview, installed-task tests, approval, and production publication, but omit GitHub Action adapter tests |

Repositories shipping GitHub Actions already live on GitHub, so GitHub Actions is
the default release orchestrator for both action-bearing types. Do not propose
Azure Pipelines orchestration as a standard alternative for those repositories.
The Azure Pipelines orchestration guidance below applies only to task-only
repositories; retain their existing orchestrator unless a change is requested or
requires clarification. Do not introduce a dependency cycle while adapting the
graph.

Use explicit successful dependencies for promotion. If `always()` is needed,
also check required predecessor results; it must not allow failed/skipped tests
to reach publishing. A second approval protects the source's post-publication
SemVer check; preserve it unless the user deliberately changes that policy.

## Task-only releases orchestrated entirely in Azure Pipelines

For the Azure Pipelines tasks-only repository type, translate the safety
invariants rather than copying GitHub-specific YAML:

- Express preparation, preview, functional testing, approval, production
  publication, and optional GitHub release finalization as stages/jobs with
  explicit `dependsOn` and success conditions. Test jobs can run in the same
  pipeline; a separate dispatch is not required. Join exact run IDs when tests
  do use separate pipelines.
- Use protected Azure DevOps environments/service connections and their
  administrator-managed approvals and checks before publishing. A YAML condition
  or an unprotected environment name is not an approval boundary. Restrict which
  pipelines may use publishing connections.
- Authenticate Marketplace operations using an AzureRM workload-identity service
  connection. Use job-scoped, least-privilege Azure DevOps identities/tokens for
  pipeline orchestration where supported; do not introduce a stored PAT to
  reproduce the GitHub-to-Azure orchestration example.
- Transfer the once-built VSIX through pipeline artifacts from the exact candidate
  run. Verify its digest and provenance before publishing, with no rebuild or
  overrides after attestation. Keep preview bytes and evidence separate.
- Select and verify a provenance mechanism that supports the Azure Pipelines
  builder and its identity. GitHub's `actions/attest-build-provenance`, workflow
  permissions, and `--signer-workflow` policy are GitHub-specific, not Azure
  Pipelines tasks/settings. Do not claim equivalent provenance from an unsigned
  checksum alone. Surface missing provenance infrastructure as a prerequisite,
  rather than silently dropping attestation.
- If GitHub hosts the source/releases, retain GitHub immutable-release settings,
  draft/final release ordering, and exact-tag guards. Use an explicitly authorized,
  least-privilege GitHub connection for those operations; Azure DevOps OIDC does
  not itself grant GitHub release-write access. If GitHub releases are not a target,
  mark that stage inapplicable without dropping Marketplace approvals or version
  enforcement.
- Apply the same frozen dependencies, version synchronization, isolated installed
  task tests, retry handling, cancellation, and dry-run constraints. Do not add a
  GitHub Actions adapter test matrix: this repository type does not ship an action.

The GitHub-specific syntax and commands below describe the source implementation.
For Azure Pipelines-only orchestration, use the equivalents above and verify
provider-specific behavior rather than presenting a mechanical YAML translation
as tested.

## Administrator setup is a separate deliverable

Record the target values and whether each setting is verified or still required:

| Area             | Required configuration                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub releases  | Enable release immutability in repository settings; verify exact-version tags cannot be rewritten after publication                                        |
| Approval         | Protected publication environment with required reviewers and appropriate deployment ref restrictions; preserve separate publisher environments where used |
| Workflow access  | Appropriate Actions policy, supported runners, dispatchable test workflow, and narrowly scoped workflow-token permissions                                  |
| Entra federation | App/service principal and GitHub federated credential matching the actual environment subject, issuer, and audience                                        |
| Marketplace      | Principal identity is a member of the correct publisher with the required publishing rights                                                                |
| Azure DevOps     | Organization uses the appropriate tenant; principal has organization/project access and permission to queue/read/cancel the test pipeline                  |
| Task tests       | Test organization has the preview installed, a pipeline using the intended YAML, and authorized workload-identity service connections                      |
| Configuration    | Client/tenant IDs, organization/project, publisher and extension IDs, pipeline name/ID, service connection names/IDs, environment names                    |

The source uses `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and
`vars.AZDO_TEST_PIPELINE_NAME`. They are identifiers/configuration, not an excuse
to introduce a client secret or stored Marketplace PAT. Do not copy its publisher
names, organization URLs, service connection GUIDs, or historical SemVer ignore.
An environment name alone does not establish approval protection.

## Version preparation and reproducible artifacts

- Accept a version through `workflow_dispatch` or `release/vX.Y.Z`; validate it
  before using it in commands or refs. The source accepts numeric `X.Y.Z`, not
  prereleases. Resolve major/minor/patch once and share outputs downstream.
- "Automatic versioning" here means synchronizing a selected version, not
  inferring a release bump from commit messages. Adapt `Scripts/update-version.mjs`
  to the target's package/lock manifests, extension manifest, task version objects,
  action examples, docs, and pipeline task major references. Preserve internal
  self-references. Do not rewrite unrelated dependency/action pins.
- Test repeated updates with the same version for byte-identical results and
  verify every shipped task's intended version policy. Reuse an existing release
  branch and avoid empty preparation commits on retries.
- Install from committed lockfiles. Build/test before packaging and use the
  target's frozen bundle equivalent. The source's `bundle:frozen` must not run
  dependency resolution, dedupe, or audit fixes; it checks shipped dependency
  manifests/lockfiles for drift afterward. Disable automatic package-manager
  cache restoration for privileged release builds.
- Package production once. Upload with missing files treated as an error. Verify
  provenance after downloading and before consumption. Publish in VSIX mode
  without publisher/version/task-ID overrides that would mutate the archive.
- For a large action dist tree, attest a single deterministic archive rather than
  thousands of files:

  ```bash
  git archive --format=tar --output "$RUNNER_TEMP/github-action-dist.tar" HEAD packages/github-action/dist
  gh attestation verify "$RUNNER_TEMP/github-action-dist.tar" --repo "$GITHUB_REPOSITORY"
  ```

  Adapt the path to include the target's shipped action runtime. Create this
  archive after committing generated output; regenerate it from the same commit
  in tests. Bind verification to the expected signer workflow and candidate
  identity using supported CLI policy options. Repository-only verification
  does not establish that the expected release workflow produced the artifact.

- VSIX provenance is a digest-based supply-chain claim, not native VSIX
  OPC/XML-DSig signing. Do not describe attestation as an Authenticode signature.

## OIDC, permissions, and workflow hygiene

- Start with `permissions: {}`. Grant per job: `contents: read` for reads,
  `contents: write` for branch/tag/release writes, `actions: write` for test
  dispatch/cancellation, and `id-token: write` for federation. Attestation jobs
  also need `attestations: write`. Do not give the entire workflow write access.
- Use `azure/login` with client/tenant IDs and `allow-no-subscriptions: true`
  where only Azure DevOps access is needed. Use `auth-type: oidc` for Marketplace
  operations. For Azure CLI pipeline orchestration obtain a short-lived token:

  ```powershell
  $token = az account get-access-token `
    --resource 499b84ac-1321-427f-aa17-267ca6975798 `
    --query accessToken --output tsv
  if ($LASTEXITCODE -ne 0 -or -not $token) { throw 'Azure DevOps token acquisition failed' }
  Write-Host "::add-mask::$token"
  "token=$token" >> $env:GITHUB_OUTPUT
  ```

  Pass it to Azure DevOps CLI through `AZURE_DEVOPS_EXT_PAT`; that variable name
  does not mean the credential is a stored PAT.

- Keep credentials out of logs. Pass untrusted inputs through environment
  variables and quote arguments, not direct interpolation into shell source.
  Check native-command exit codes explicitly in PowerShell.
- Disable checkout credential persistence except in jobs that actually push.
  Harden runners; use a maintained egress allowlist for build jobs and distinguish
  audit mode from enforced blocking.
- Resolve third-party actions immutably through the target's established policy
  (this repository uses `actions.lock`). Build/publish tooling should be a known
  released version, not candidate code or floating `main`.
- Use `$/` for intentional same-repository candidate action tests, ensuring the
  test workflow executes at the candidate commit. This syntax needs a compatible
  runner (at least 2.336.0). Do not substitute `$/` for stable release tooling.
- Suppress workflow command processing around tests that intentionally emit
  command-like strings; restore it using a random marker and preserve the test
  process's failure exit status.

## Preview and functional testing

- Patch a copy of the production VSIX into a private preview identity, generating
  distinct deterministic task IDs so preview installation cannot replace
  production tasks. Attest the patched bytes separately before publishing.
- Wait for Marketplace validation, share/install into the test organization,
  then wait for installation before queueing installed-task tests.
- On a preview retry, query the exact intended version. If already published,
  download that version and verify its original provenance and expected signer.
  Do not rebuild, patch, or re-attest downloaded bytes to make verification pass.
- Put matrix fan-out in the parent release workflow for independently visible
  and rerunnable scenarios. The source covers Linux/Windows and PAT-compatible/
  OIDC modes: GitHub Actions uses `pat`/`oidc`; Azure Pipelines uses
  `PAT`/`AzureRM`. Adapt to supported platforms, not a fixed cosmetic matrix.
- GitHub Actions tests dispatch at the candidate ref and execute candidate
  actions, verifying dist provenance first. Azure Pipelines tests run the
  installed preview tasks, not just a local source build; distinct preview task
  IDs are what isolate that execution from production.
- PAT-compatible tests need no stored PAT: acquire a short-lived bearer token via
  OIDC. Azure Pipelines can inject it into the job's Marketplace service endpoint
  with `task.setendpoint`; mask with `task.setsecret` first. Do not persistently
  rewrite the service connection. Prefer direct AzureRM federation outside that
  compatibility scenario.
- Give each OS/auth scenario its own test extension/resource identity to avoid
  collisions. Also address overlapping release runs targeting the same resources,
  for example with serialization that does not cancel an in-progress publication.
- Exercise the target's real operations and assert meaningful outputs or effects.
  For this repository, package/patch/publish/download and SHA-256 round-trip
  equality are examples. Other extensions need their own functional assertions.

## Dispatch must join the exact child run

- GitHub: dispatch the test workflow with explicit candidate ref/version and
  matrix inputs; capture the returned run identity. Verify the installed `gh`
  version supports the source's run-URL response. Do not guess the newest run by
  list order when concurrent dispatches are possible.
- Azure DevOps: use `az pipelines run` with explicit organization, project,
  release branch, and validated matrix parameters; capture its returned ID.
- Emit the child URL and ID into job outputs and summaries immediately. Poll
  that ID with a bounded timeout. Only GitHub `success` or Azure DevOps
  `succeeded` passes; dispatch failure, query failure, cancellation, timeout,
  partial success, or missing/unknown results must fail the parent.
- When the parent is cancelled, attempt cancellation of its known child IDs.
  Report cancellation errors without masking the original failure. Never cancel
  an unrelated run or make a cleanup failure look like successful testing.

## Approval, publication, retries, and cleanup

- Create/update only a draft after candidate checks pass. Attach the unchanged,
  verified VSIX and provenance links. Generate notes from the previous numeric
  semantic version, not lexical tag order. Draft creation is not immutable
  publication.
- Put protected-environment approval before irreversible production actions.
  The source publishes Marketplace first, waits for validation, then publishes
  the GitHub draft. Only afterward move floating `vMAJOR`/`vMAJOR.MINOR` aliases.
- Query existing state before mutations. Distinguish not-found from denied
  access, outages, and other CLI errors. Treating every failed lookup as absence
  is not safe idempotency.
- If an exact version is already deployed, skip publishing it again and continue
  validation. Establish that it is the intended artifact, not merely the same
  version string. For a finalized release, verify existing commit/assets and
  resume only missing safe work, or stop clearly; never delete it or move its tag.
- Keep drafts/release branches after failed checks for diagnosis and resumption.
  Decide cancellation cleanup explicitly. Delete only the intended release branch
  after final required results, never a default/source branch.
- State dry-run side effects accurately: the source still prepares/pushes a
  release branch, publishes and installs previews, runs live tests, and
  creates/updates an exact tag and draft. It skips production and final GitHub
  publication; it is not an offline or side-effect-free check.

## Source limitations to handle, not blindly propagate

The source includes temporary `$/patch` and `$/download-vsix` bootstrap steps;
replace them with known released tooling when available. Its exact-version tag
step force-updates before the draft script checks for an existing published
release: a migration must guard finalized state **before** any tag mutation.
Its same-version production shortcut alone does not prove deployed-byte equality.
Several comments describe older environment names or ordering; actual job
dependencies and environment settings are authoritative.

Post-publication SemVer checking detects hygiene issues but cannot undo a release.
Run feasible version/doc/tag-policy checks before approval as well, then retain
the post-publication immutability/floating-tag checks with `auto-fix: false`.
Do not transfer source-specific ignored versions into another repository.

## Acceptance checks before handoff

1. Review the effective job graph and conditions: all required tests and approval
   precede irreversible actions; dry-run cannot reach production/finalization.
2. Run the target's workflow/security linter and dependency-pin validation.
   Validate Azure Pipelines YAML/parameters with its available tooling. Inspect
   required reviewers, federation subjects, permissions, and immutable-release
   settings separately; report inaccessible settings as unverified.
3. Test version rewriting twice in a disposable fixture, including major changes,
   task versions, action examples, preserved self-references, and invalid input.
4. Run relevant build/tests/frozen bundling and check for shipped dependency drift.
   Verify artifact paths, attestation subject, downloaded bytes, and candidate
   commit identity agree. Do not assume a green source build tests installed tasks.
5. Exercise retry/error paths with mocks or fixtures: absent release, existing
   draft, finalized release, existing Marketplace version, failed lookup, failed/
   cancelled child, timeout, and artifact/signer mismatch.
6. Only with authorization, run live candidate validation. Record actual child
   runs and results. Label unexercised cloud behavior and required admin actions
   plainly rather than claiming end-to-end release readiness.
