---
applyTo: 'vss-extension.json,**/vss-extension.json,packages/**/task.json,action.yml,**/action.yaml'
description: Guidance for Azure DevOps extension and task manifests
---

- When editing `vss-extension.json` or any Azure Pipelines `task.json`, preserve schema-compatible structure and required fields.
- For Azure Pipelines task manifests, use the official schema as the source of truth:
  - https://github.com/microsoft/azure-pipelines-task-lib/blob/master/tasks.schema.json
- Keep input and output variable naming consistent and update any runtime input/output lookups when manifest names change.
- Update manifest help text examples when input names are renamed so examples stay accurate.
- When renaming task inputs, keep backward compatibility by adding an `aliases` array to the new canonical input name.
- Include legacy and commonly-used alternate names in `aliases` (for example old camelCase names and kebab-case variants).
- Keep `visibleRule` expressions and execution/runtime references aligned to the canonical input name (not aliases).

## `visibleRule` behavior and limits (current understanding)

- Azure Pipelines task UI applies `visibleRule` dynamically and effectively **cascades** visibility through dependencies:
  - If input **B** depends on input **A** and **A** is hidden by its own rule, **B** will not be shown even when **B**'s rule could otherwise evaluate true.
  - In practice, treat hidden dependencies as making downstream dependent inputs unreachable.
- Design rules as a hierarchy from broad gate → specific gate:
  - First gate by `operation` (or other top-level selector), then gate dependent inputs by mode selectors (for example `use`, `publish-source`).
- Avoid circular or mutually exclusive dependency chains between peer inputs; they can make inputs impossible to surface.
- Keep gating selectors visible wherever downstream inputs need them.
- `visibleRule` expressions can only reference inputs that are defined earlier in `task.json`.
- When adding or renaming selector inputs, ensure selector fields are declared before any inputs whose `visibleRule` depends on them.
- Prefer simple boolean expressions and avoid mixing `&&` and `||` in the same rule expression to reduce ambiguity and validation issues.
- Rule evaluation only controls UI visibility.
- YAML pipelines do **not** enforce `visibleRule`, so users can provide inputs even when those inputs would be hidden in the UI.
- Runtime code must always validate allowed/required input combinations independent of `visibleRule` results.
- When changing a selector input (for example renaming or narrowing scope), re-check all dependent inputs’ `visibleRule` values to prevent accidental UI regressions.

## Action wrapper synchronization strategy

- Treat root `action.yml` as the source of truth for shared input/output metadata.
- Keep every composite wrapper `*/action.yaml` synchronized for:
  - input names and defaults
  - forwarded `runs.steps[0].with` mappings
  - input/output descriptions (wrapper descriptions must include root descriptions)
  - operation-scoped required flags comments
- After any change to root `action.yml` or any wrapper `action.yaml`, run the synchronization tests:
  - `packages/github-action/src/__tests__/action-wrapper-contract.test.ts`
  - `packages/github-action/src/__tests__/action-metadata-parity.test.ts`
  - `packages/github-action/src/__tests__/action-required-comments.test.ts`
- Preferred command:
  - `npm test -- packages/github-action/src/__tests__/action-wrapper-contract.test.ts packages/github-action/src/__tests__/action-metadata-parity.test.ts packages/github-action/src/__tests__/action-required-comments.test.ts`
- Do not merge wrapper metadata/input changes until these tests pass.
