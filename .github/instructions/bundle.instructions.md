---
applyTo: '**/bundle.mjs'
description: Guidance for bundling and minifying the javascript code for GitHub Actions and Azure Pipelines
---

# Bundling guidance

## Azure Pipelines

### Primary goals

- Prefer bundling by default to reduce runtime dependency surface.
- Keep only proven runtime blockers external.
- Preserve runtime behavior for `azure-pipelines-task-lib`, `azure-pipelines-tool-lib`, `azure-pipelines-tasks-artifacts-common`, and `azure-pipelines-tasks-azure-arm-rest`.

### Externals policy

- Treat the Azure DevOps target as `selective externalization`.
- Keep these external unless there is a verified replacement strategy:
  - `tfx-cli`
  - `msalv1`, `msalv2`, `msalv3` (dynamic runtime resolution from ARM rest package)
  - `shelljs` (dynamic loading behavior used by task-lib/tool-lib paths)
- Do **not** add `azure-pipelines-task-lib` or `azure-pipelines-tool-lib` back to externals by default; first try to bundle with resource staging.

### Resource rewrite and staging

When a bundled package reads files relative to `__dirname`, rewrite lookups to `dist/__bundle_resources/<package>/...` and copy required assets.

- Rewrite known patterns in bundled modules:
  - `path.join(__dirname, 'module.json')`
  - `path.join(__dirname, 'lib.json')`
  - `path.join(__dirname, 'package.json')`
- For `azure-pipelines-tasks-azure-arm-rest`, also rewrite OpenSSL executable path joins for versioned folders (for example `path.join(__dirname, 'opensslX.Y.Z', 'openssl')`) rather than hardcoding specific versions.
- Copy package assets into `__bundle_resources/<package>/`:
  - `module.json` (if present)
  - `lib.json` (if present)
  - `package.json` (required)
  - `Strings/` (if present)
  - For ARM rest: all OpenSSL folders matching the package layout (for example `opensslX.Y.Z/` or `openssl/`) (if present)

### Runtime dependency manifest rules

- `runtime-dependencies.json` and dist `package.json` must reflect the final `external` list.
- Resolve alias dependency versions (`msalv1/v2/v3`) from parent package metadata (`azure-pipelines-tasks-azure-arm-rest`) instead of hardcoding.
- Prefer lockfile-resolved versions for other externals when available.

### Change checklist (Azure target)

When modifying `Scripts/bundle.mjs` for Azure target, always validate:

1. `npm run bundle:azdo` succeeds.
2. `packages/azdo-task/dist/runtime-dependencies.json` matches intended externals.
3. `packages/azdo-task/dist/bundle.js` contains rewritten `__bundle_resources` lookups for required resources.
4. `packages/azdo-task/dist/__bundle_resources` contains expected package files and `Strings` folders.
5. Local smoke run reaches expected auth boundary (e.g., invalid PAT => 401), not module/resource resolution failures.

### Debugging heuristics

- Errors like `Not found resource file path .../dist/module.json` indicate missing rewrite/copy coverage.
- Errors around `Cannot find module` after bundling usually mean either:
  - an unresolved dynamic `require(...)` path that should stay external, or
  - missing runtime dependency entries in generated dist manifest.
- For any new third-party package brought into the bundle, search for `path.join(__dirname, ...)` and dynamic `require(...)` before deciding external vs bundled.

### Scope guardrails

- Keep edits minimal and targeted to bundling behavior.
- Do not change command/runtime semantics while fixing bundle packaging.
- Prefer deterministic transforms over broad regex rewrites.

## GitHub Actions

### Primary goals

- Keep the action bundle self-contained where possible.
- Keep externals minimal and intentional.

### Checklist (Actions target)

1. `npm run bundle:actions` succeeds.
2. Dist runtime manifest matches target externals.
3. No unintended Azure Pipelines-specific rewrites are applied to the actions target.

### Consistency rules

- Shared helpers in `Scripts/bundle.mjs` must remain target-aware (via target config) rather than hard-coded for one adapter.
- Any new rewrite/copy rule should be controlled by target metadata (`bundledModuleResourcePackages`, etc.) so it can be enabled/disabled per target.
