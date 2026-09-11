---
name: actions-lock
description: 'Regenerate/update .github/workflows/actions.lock in this repo using the gh actions-lock CLI. USE WHEN: relock actions, update actions.lock, gh actions-lock, actions-lock CLI, pin GitHub Actions to SHA, dependabot github_actions PR, moved branch/version ref, unreachable-pin error, LOCAL-ACTION error, uses: $/ vs uses: ./, relock main branch ref, jessehouwing/azdo-marketplace@main pin, self-repository syntax.'
---

# gh actions-lock — repo-safe usage

This repo uses the `gh actions-lock` extension (github/gh-actions-lock) to pin
GitHub Actions dependencies to immutable commit SHAs in
`.github/workflows/actions.lock`.

## `uses: $/` is now valid and preferred for same-repo references

As of the [July 30, 2026 GitHub Actions "self-repository syntax"
changelog](https://github.blog/changelog/2026-07-30-reference-same-repository-actions-with-self-repository-syntax/),
a `uses:` value starting with `$/` resolves to this workflow's own repository
at the exact commit that is running — no checkout required, and it works
everywhere `./` did (steps, composite actions, nested composition, and
reusable workflow calls). This requires the GitHub Actions runner to be
`>= 2.336.0`.

`.github/workflows/release-test-github-actions.yml` now uses `uses: $/...`
for all of its same-repo action references (previously `uses: ./...`).
`gh actions-lock --relock` handles this cleanly today (no `LOCAL-ACTION`
warning/failure, no rewriting needed) — this superseded the older restriction
below.

**Historical note (no longer applicable):** earlier revisions of this repo
used `uses: ./` for same-repo references and treated any `gh actions-lock`
migration to `uses: $/` as broken/invalid syntax, requiring
`--no-migrate-local-actions` to suppress it. That restriction predates
GitHub's official self-repository syntax feature; `actionlint` (a static
GitHub Actions linter) still does not recognize `$/` as of this writing and
will flag it as an error — this repo uses `zizmor` instead for workflow
linting, which correctly understands `$/`. Do not reintroduce
`--no-migrate-local-actions` or revert `$/` back to `./` based on
`actionlint` output.

## `release.yml`'s own self-referencing tool steps: pin to a real released tag, not `$/`

`release.yml` itself calls this repo's own actions (`package`, `publish`,
`wait-for-validation`, `share`, `install`, `wait-for-installation`,
`query-version`) to build and ship a _new, not-yet-released_ version. These
steps must NOT use `$/` (that would run this commit's unreleased,
in-progress code as its own build tooling) and must NOT float on `@main`.
Pin them to the last known-good **published version tag** (e.g. `@v6.2.10`),
the same way any external consumer would reference this action. Dependabot
bumps these like any other third-party action pin; `gh actions-lock` then
resolves the tag to a SHA as usual.

## Correct command to relock/update the lockfile

```powershell
gh actions-lock --relock --no-interactive
```

- `--relock` bumps moved branch/version refs (e.g. `main`, `v4`) to their
  current upstream SHA.
- No `--no-migrate-local-actions` flag is needed anymore — `$/` self-refs are
  valid and intentional in this repo.

After running, review the diff — it should only touch
`.github/workflows/actions.lock` (bumped SHAs / new entries for changed
pins), not rewrite any `uses:` lines in the workflow files themselves.

## When Dependabot opens a `dependabot/github_actions/...` PR

The `.github/workflows/dependabot-actions-lock.yml` workflow automatically
regenerates the lockfile on such PRs using `gh actions-lock --no-interactive
--no-onboard --rescan`.
