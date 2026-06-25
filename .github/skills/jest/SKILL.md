---
name: jest
description: "Run Jest 30 tests in this ESM/TypeScript project on Windows/PowerShell. USE WHEN: running jest, running tests, running a single test file, running a specific test by name, npm test, jest CLI invocation, test failures, 'Unknown option testPathPattern', 'jest: command not found', 'experimental-vm-modules' error, 'Must use import to load ES Module', NODE_OPTIONS not working, $env:NODE_OPTIONS overriding debugger, PowerShell jest invocation, npx jest, --testPathPattern singular vs --testPathPatterns plural, --filter option, --testNamePattern, choosing between --testPathPatterns and --testNamePattern, Jest 30 CLI changes, ts-jest ESM."
argument-hint: 'Describe what tests to run (all, specific file path/pattern, or test name pattern)'
---

# Jest 30 Test Runner — PowerShell & ESM

## TL;DR — Use this command

```powershell
# All tests
npm test

# A specific file (substring of path, no = sign needed but allowed)
npm test -- --testPathPatterns "manifest-editor"

# A specific test by describe/it name
npm test -- --testNamePattern "applies options"
```

**Never** set `$env:NODE_OPTIONS` manually. **Never** use `npx jest` directly. **Never** use `--testPathPattern` (singular). See [Pitfalls](#pitfalls) for why.

## Why this skill exists

This project uses **Jest 30** with native ESM (`--experimental-vm-modules`) and `ts-jest`. Three recurring failure modes on Windows/PowerShell:

| Failure                                        | Cause                                                                                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Unknown option "--testPathPattern"`           | Singular form was **removed** in Jest 30. Must use plural `--testPathPatterns`.                                                                 |
| `Must use import to load ES Module`            | `--experimental-vm-modules` not set. Happens when calling `npx jest` directly.                                                                  |
| VS Code debugger breaks, terminal can't attach | `$env:NODE_OPTIONS = "--experimental-vm-modules"` **overwrote** VS Code's injected flags (e.g., `--require <bootloader>`) instead of appending. |

## Preferred Commands

| Goal                                | Command                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| Run all tests                       | `npm test`                                                           |
| Run with coverage                   | `npm run test:coverage`                                              |
| Run a specific file (regex on path) | `npm test -- --testPathPatterns "<pattern>"`                         |
| Run a specific test name            | `npm test -- --testNamePattern "<regex>"`                            |
| Combine both                        | `npm test -- --testPathPatterns "<path>" --testNamePattern "<name>"` |
| Run by exact path (no regex)        | `npm test -- --runTestsByPath path/to/file.test.ts`                  |

`package.json` `scripts.test` already encodes the correct base invocation:

```
node --experimental-vm-modules ./node_modules/jest/bin/jest.js --no-coverage
```

`npm test --` forwards extra args to that script, so `NODE_OPTIONS` and `--experimental-vm-modules` are always preserved correctly.

## Jest 30 CLI changes to remember

- **`--testPathPattern` (singular) is REMOVED.** It was deprecated in 29.7, removed in 30.0. Always use **`--testPathPatterns`** (plural). Accepts a regex against the full test file path.
- **`--testNamePattern`** (singular) is the correct name flag — alias `-t`. Don't add an `s`.
- **`--filter=<file>`** is a separate feature: a path to a JS module exporting `(testPaths) => ({ filtered: [...] })`. It is **not** a substring/regex filter. Don't reach for it when you just want to run one test file — use `--testPathPatterns`.
- Both `=` syntax and space syntax work: `--testPathPatterns=foo` ≡ `--testPathPatterns foo`.
- On Windows, in path patterns use `/` as separator or escape `\` as `\\`.

## Pitfalls

### ❌ Do NOT set `$env:NODE_OPTIONS` in PowerShell

```powershell
# ❌ Overwrites VS Code debugger's injected --require <bootloader>; debugger breaks
$env:NODE_OPTIONS = "--experimental-vm-modules"; npx jest --no-coverage
```

`$env:NODE_OPTIONS = "..."` **replaces** the variable. VS Code injects bootloader flags into `NODE_OPTIONS` for the integrated terminal; clobbering them silently breaks debugging and tool integration.

### ❌ Do NOT use `npx jest`

```powershell
# ❌ npx jest does NOT inherit --experimental-vm-modules from package.json scripts
npx jest --no-coverage
# → "Must use import to load ES Module" or "Jest encountered an unexpected token"
```

`npx` resolves and runs `jest` directly via node — it doesn't read `scripts.test`. The flag must be on `node` itself, not on `jest`.

### ❌ Do NOT use `--testPathPattern` (singular)

```powershell
# ❌ Jest 30: "Unknown option --testPathPattern"
npm test -- --testPathPattern "foo"
```

Use `--testPathPatterns` (plural).

### ✅ If you absolutely must set NODE_OPTIONS, append

```powershell
# Append, don't overwrite — preserves VS Code debugger flags
$env:NODE_OPTIONS = "$env:NODE_OPTIONS --experimental-vm-modules"
node ./node_modules/jest/bin/jest.js --no-coverage
```

But really: just use `npm test --`.

## Key config references

- **`package.json` `scripts.test`**: `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --no-coverage`
- **`jest.config.ts`**: preset `ts-jest/presets/default-esm`, `extensionsToTreatAsEsm: ['.ts']`
- **Test files pattern**: `**/__tests__/**/*.test.ts`
- **Jest version**: `^30.4.2` (see [package.json](../../../package.json))
