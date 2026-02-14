# AGENT.md — Copilot Coding Agent Instructions

## Repository Overview

This repository is undergoing a major refactor from v5 to v6. The goal is to consolidate 10 separate Azure DevOps pipeline tasks into a single unified task with a shared, platform-agnostic core library.

**Current State**: The repository contains both:
- **v5 tasks** (legacy): Individual tasks in `BuildTasks/` directory
- **v6 packages** (new): npm workspace monorepo with 3 packages in `packages/`

### v6 Architecture (Work in Progress)

npm workspace monorepo with 3 packages:
- `packages/core` — Platform-agnostic extension task business logic
- `packages/azdo-task` — Azure Pipelines task adapter
- `packages/github-action` — GitHub Actions adapter

## Quick Start

```bash
# Install all dependencies (including v5 tasks)
npm run initdev

# Build v6 packages only
npm run build:v6

# Build everything (v5 + v6)
npm run build

# Run Jest tests (v6 only)
npm run test

# Run tests with coverage
npm run test:coverage

# Bundle v6 consumers
npm run bundle

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## Key Commands (v6 Development)

| Command | Description |
|---------|-------------|
| `npm run build:v6` | TypeScript compile v6 packages (via workspaces) |
| `npm run test` | Jest unit tests (ESM mode, v6 packages) |
| `npm run bundle` | Rollup bundle for azdo-task and github-action |
| `npm run lint` | ESLint check (flat config) |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Auto-format with Prettier |
| `npm run format:check` | Check Prettier formatting |

## v6 Architecture Principles

- **Platform-agnostic core**: All business logic in `packages/core/src/` never imports platform-specific packages
- **IPlatformAdapter interface**: Platform adapters implement this interface to abstract input/output/exec/filesystem operations
- **Command pattern**: Each tfx subcommand is a standalone async function
- **Tests use MockPlatformAdapter**: Located in `packages/core/src/__tests__/helpers/`
- **ES Modules**: All imports MUST use explicit `.js` extension (e.g., `import * as common from "./module.js"`)
- **Node 16+ module resolution**: TypeScript config uses `"module": "Node16"` and `"moduleResolution": "Node16"`

## File Organization

```
/
├── packages/                          # v6 workspace packages
│   ├── core/                          # @extension-tasks/core
│   │   ├── src/
│   │   │   ├── index.ts               # Public API barrel
│   │   │   ├── platform.ts            # IPlatformAdapter interface
│   │   │   ├── commands/              # Command implementations
│   │   │   └── __tests__/             # Jest tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── azdo-task/                     # Azure Pipelines task adapter
│   └── github-action/                 # GitHub Actions adapter
├── BuildTasks/                        # v5 legacy tasks (still active)
├── tsconfig.base.json                 # Shared TypeScript config for v6
├── jest.config.ts                     # Test configuration (Jest + ts-jest)
├── rollup.config.ts                   # Bundle configuration
├── eslint.config.mjs                  # ESLint flat config
├── .prettierrc.yml                    # Prettier configuration
├── .node-version                      # Pin Node.js version (24)
├── plan.md                            # Complete refactor plan
└── AGENT.md                           # This file
```

## Development Workflow

1. **Make changes** in `packages/core/src/` for business logic
2. **Run tests**: `npm run test` to verify
3. **Lint and format**: `npm run lint:fix && npm run format`
4. **Bundle** (if needed): `npm run bundle` for consumer packages
5. **Commit** both source and any generated dist/ changes

## Testing

- Tests use **Jest** with **ts-jest** for ESM support
- Mock implementations in `packages/core/src/__tests__/helpers/mock-platform.ts`
- Test files follow pattern: `**/__tests__/**/*.test.ts`
- Run specific project: `npx jest --selectProjects=core`

## Refactor Plan

See `plan.md` for the complete refactor plan. The implementation is broken into phases:

- **Phase 0**: Repository scaffold (npm workspaces, TypeScript, ESLint, Prettier, Jest, Rollup) ← **CURRENT**
- **Phase 1**: Core library scaffold (IPlatformAdapter, ArgBuilder, JsonOutputStream, VersionUtils)
- **Phase 2**: Command implementations
- **Phase 3**: VSIX Editor rewrite
- **Phase 4**: TfxManager
- **Phase 5**: Azure Pipelines adapter
- **Phase 6**: GitHub Actions adapter
- **Phase 7**: Comprehensive testing
- **Phase 8**: Build optimization and CI/CD

## Important Notes

- **Both v5 and v6 coexist**: The v5 tasks are still the production code. v6 is under development.
- **ES Module imports**: Always use `.js` extensions in imports, even in `.ts` files
- **Node version**: Pinned to Node 24 in `.node-version`
- **TypeScript strict mode**: Enabled, but `strictNullChecks: false` for gradual migration
- **No class hierarchies**: Prefer standalone functions over classes where possible

## When Unsure

1. Check `plan.md` for detailed architecture and design decisions
2. Look at similar existing code in `BuildTasks/` for v5 patterns
3. For v6 code, follow the structure outlined in `plan.md`
4. Ask the user for guidance if the approach is unclear
