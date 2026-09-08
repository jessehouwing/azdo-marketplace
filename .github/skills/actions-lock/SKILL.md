---
name: actions-lock
description: 'Regenerate/update .github/workflows/actions.lock in this repo using the gh actions-lock CLI. USE WHEN: relock actions, update actions.lock, gh actions-lock, actions-lock CLI, pin GitHub Actions to SHA, dependabot github_actions PR, moved branch/version ref, unreachable-pin error, LOCAL-ACTION error, uses: $/ vs uses: ./, relock main branch ref, jessehouwing/azdo-marketplace@main pin.'
---

# gh actions-lock — repo-safe usage

This repo uses the `gh actions-lock` extension (github/gh-actions-lock) to pin
GitHub Actions dependencies to immutable commit SHAs in
`.github/workflows/actions.lock`.

## Critical rule: never let it rewrite local `./` action refs

`.github/workflows/release-test-github-actions.yml` uses same-repo local
action references (`uses: ./`) to test this action against itself. The
default `--rescan`/fix behavior of `gh actions-lock` migrates these to the
"inherently-pinned" `uses: $/` form. **`uses: $/` is not valid GitHub Actions
syntax and breaks the workflow in this repo.** Do not accept or commit that
migration.

## Correct command to relock/update the lockfile

```powershell
gh actions-lock --relock --no-migrate-local-actions --no-interactive
```

- `--relock` bumps moved branch/version refs (e.g. `main`, `v4`) to their
  current upstream SHA.
- `--no-migrate-local-actions` prevents rewriting `uses: ./` to `uses: $/`.
- Expect a `LOCAL-ACTION` warning/failure for
  `release-test-github-actions.yml` — this is expected and fine; that
  workflow is intentionally excluded from lock coverage because of its local
  action refs. Other workflows still get relocked correctly.

After running, review the diff — normally only `.github/workflows/actions.lock`
changes (bumped SHAs). If a diff to any `*.yml` workflow shows `./` being
replaced with `$/`, discard it:

```powershell
git checkout -- .github/workflows/release-test-github-actions.yml
```

## When Dependabot opens a `dependabot/github_actions/...` PR

The `.github/workflows/dependabot-actions-lock.yml` workflow automatically
regenerates the lockfile on such PRs using `gh actions-lock --no-interactive
--no-onboard --rescan` (no `--no-migrate-local-actions` flag there either —
if this ever touches `release-test-github-actions.yml`, flag it for a fix,
since bot-driven runs risk the same `$/` migration issue).

## Do NOT use plain `--rescan` locally without the migrate flag

`gh actions-lock --no-interactive --no-onboard --rescan` (without
`--no-migrate-local-actions`) WILL rewrite `uses: ./` → `uses: $/` in
`release-test-github-actions.yml`. Always add `--no-migrate-local-actions`
when running any fix/relock/rescan command locally in this repo.
