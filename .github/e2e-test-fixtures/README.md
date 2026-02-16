# E2E Test Fixtures

This directory contains fixtures and sample data used by end-to-end tests.

## Contents

### `sample-extension/`

A minimal but valid Azure DevOps extension used for E2E testing.

**Structure:**
```
sample-extension/
├── vss-extension.json       # Extension manifest
├── SampleTaskV1/            # Task version 1
│   ├── task.json
│   └── index.js
├── SampleTaskV2/            # Task version 2
│   ├── task.json
│   └── index.js
├── images/                  # Extension assets
│   └── icon.png
└── README.md                # Extension documentation
```

**Features:**
- 2 sample tasks (V1 and V2) for testing multi-task scenarios
- Minimal implementations (just console output)
- Valid extension manifest structure
- Proper task.json definitions
- Small footprint for fast testing

**Usage:**

This extension is referenced by E2E workflows in `.github/workflows/e2e/`:

```yaml
- uses: ./package
  with:
    root-folder: '.github/e2e-test-fixtures/sample-extension'
    output-path: './dist'
```

**Customization:**

To use with your own publisher:

1. Update `publisher` in `vss-extension.json`
2. Optionally update extension `id` and `name`
3. Optionally update task UUIDs (or use `update-tasks-id: true`)

## Adding New Fixtures

To add new test fixtures:

1. Create a new directory under `.github/e2e-test-fixtures/`
2. Add necessary files (manifests, tasks, etc.)
3. Document the fixture in this README
4. Reference from E2E workflows

## Notes

- Keep fixtures minimal (fast test execution)
- Use realistic but simple scenarios
- Document any special requirements
- Don't commit sensitive data or credentials
- Use private publishers for published test extensions

## Related Documentation

- [E2E Testing Strategy](../../docs/e2e-testing.md)
- [E2E Testing Quick Reference](../../docs/e2e-testing-quick-reference.md)
