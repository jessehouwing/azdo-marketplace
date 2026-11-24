---
name: secure-extension-release
description: 'Implement or migrate safe release automation for Azure DevOps extensions, Azure Pipelines tasks, and GitHub Actions using azdo-marketplace release patterns, including releases orchestrated entirely in Azure Pipelines. USE WHEN: secure releases, migrate extension release workflow, Azure Pipelines-only releases, immutable releases, release approvals, VSIX provenance or attestation, Marketplace OIDC publishing, automatic release version updates, idempotent releases, dispatch and wait for Azure Pipelines or GitHub Actions release tests, floating tags, release version enforcement.'
---

# Secure extension releases

Implement release automation using this repository's release workflow as a
worked example, not a workflow to copy verbatim. Support three repository types:

| Published products                     | Release orchestration             | Required functional coverage                  |
| -------------------------------------- | --------------------------------- | --------------------------------------------- |
| GitHub Actions + Azure Pipelines tasks | GitHub Actions                    | Candidate actions and installed preview tasks |
| GitHub Actions only                    | GitHub Actions                    | Candidate actions                             |
| Azure Pipelines tasks only             | GitHub Actions or Azure Pipelines | Installed preview tasks                       |

Default repositories shipping a GitHub Action to GitHub Actions orchestration;
their source already lives on GitHub. Azure Pipelines orchestration is an option
for task-only repositories, not a recommended alternative for the other two types.
Omit only genuinely inapplicable platform stages. Preserve the target repository's
build and packaging conventions.

## Read the implementation before editing

Read [the migration reference](references/migration.md), then the relevant source
files below. Paths are relative to the azdo-marketplace repository root:

| Source                                                                | Patterns to extract                                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/release.yml`                                       | Job dependencies, prepare/build/attest, preview, dispatch-and-wait tests, approval, draft and final publication, retry handling |
| `.github/workflows/release-test-github-actions.yml`                   | Candidate action execution, dist provenance verification, OS/auth matrix inputs, real functional tests                          |
| `.github/pipelines/test-azure-pipelines.yml`                          | Installed preview task execution, OS/auth parameters, short-lived token compatibility for PAT inputs                            |
| `Scripts/update-version.mjs`                                          | Idempotent version synchronization across manifests, tasks, examples, and documentation                                         |
| `packages/github-action/src/__tests__/release-version-update.test.ts` | Version rewrite and repeat-run regression test                                                                                  |
| `docs/authentication-and-oidc.md`                                     | Federated identity, organization access, and Marketplace publisher membership                                                   |
| `docs/vsix-provenance.md`                                             | Patch-before-attest, exact-byte publishing, and verified preview recovery                                                       |
| `.github/skills/actions-lock/SKILL.md`                                | Immutable dependency resolution and released tooling versus candidate self-references                                           |

When migrating another repository, obtain these files from
[jessehouwing/azdo-marketplace](https://github.com/jessehouwing/azdo-marketplace)
if they are not available locally. Record the source commit inspected in the
handoff. Do not invent missing workflow inputs or copy obsolete action versions.
If source access is unavailable, state that limitation.

## Migration procedure

1. **Inventory the target.** Identify publishers, production/preview extension
   IDs, task IDs and versions, action entry points and dist directories, existing
   build commands, test fixtures, environments, branch/tag protections, and release
   scripts. Classify it as one of the three repository types above, establish
   the corresponding release orchestrator, and identify supported authentication
   modes. For task-only repositories, retain the existing orchestrator unless
   the migration requires a user decision.
2. **Map configuration.** Separate repository edits from GitHub/Entra/Azure DevOps
   administrator setup. Replace every source-specific organization, project,
   publisher, extension ID, service connection, pipeline, environment, and path.
   Ask for missing identity or approval decisions rather than guessing.
3. **Implement preparation.** Resolve one validated version, synchronize all
   dependent references, build and test from locked dependencies, freeze the
   shipped runtime dependency tree, package once, and attest final artifacts.
   Commit the candidate output on the release branch before testing its action
   dist. Make version rewriting repeatable.
4. **Implement candidate validation.** Publish an isolated preview with distinct
   task IDs; wait for Marketplace validation and installation. Trigger the
   applicable GitHub Actions and Azure Pipelines functional tests and wait for
   each specific child run's successful completion, or use dependent test stages
   within the release pipeline. Adapt scenarios to the
   extension's real operations; do not copy marketplace-management tests into an
   unrelated extension.
5. **Implement guarded promotion.** Create the draft and attach the verified
   production VSIX after candidate tests pass. Require protected-environment
   approval before production Marketplace publication or final GitHub release
   publication. Publish unchanged bytes; finalize the immutable release only
   after Marketplace publication/validation succeeds where applicable.
6. **Implement recovery and enforcement.** Handle already-published versions,
   drafts, finalized releases, floating aliases, timeouts, and cancellations
   explicitly. Enforce version references and release/tag hygiene. Keep failure
   evidence and resumable state.
7. **Validate without releasing.** Follow the acceptance checks in the reference.
   Report administrator prerequisites and checks not exercised. Do not trigger a
   release, upload to Marketplace, alter protections, or enable cloud resources
   merely to validate the migration without explicit user authorization.

## Non-negotiable invariants

- Production VSIX bytes must match the verified attestation and GitHub asset:
  no repackaging or manifest/task overrides after attestation. Preview changes
  create a separate artifact and attestation.
- Privileged jobs use trusted release refs, job-scoped least privilege, protected
  environments, and short-lived OIDC credentials. No long-lived PAT is required
  merely to exercise a PAT-compatible input.
- Successful dispatch is not successful testing. Any child failure, cancellation,
  timeout, or unverifiable result blocks promotion.
- Never force-update an exact tag or delete/replace an already-published release.
  Only floating major/minor aliases may move, after successful final publication.
- Immutability and required reviewers are repository/environment settings, not
  guarantees supplied by workflow YAML alone.
- Read actual dependencies (`needs`/`dependsOn`), conditions, and step logic,
  not just comments. The source has
  bootstrap exceptions and limitations described in the migration reference.

## Completion

Deliver the target's workflow/script changes plus a concise handoff identifying
source revision, platform coverage, remaining administrator configuration, and
any unverified release behavior. Keep the migration scoped; ask before adding
README content. Never claim configured approvals, federation, or immutability
without verifying those settings.
