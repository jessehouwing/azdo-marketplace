---
name: jest
description: 'Run Jest tests in this ESM/TypeScript project on PowerShell without breaking NODE_OPTIONS or experimental-vm-modules flags. USE FOR: running jest, running tests, test failures, experimental-vm-modules error, testPathPattern deprecated, NODE_OPTIONS conflict, npm test, jest --testPathPatterns, run specific test file, test a single file, powershell jest.'
argument-hint: 'Describe what tests to run (all, specific file, or test name pattern)'
---

# Jest Test Runner — PowerShell & ESM

This project uses Jest with ESM (`--experimental-vm-modules`) and ts-jest. Running Jest incorrectly in PowerShell causes two common failures:

1. **`NODE_OPTIONS` overwrite** — Setting `$env:NODE_OPTIONS = "--experimental-vm-modules"` replaces VS Code's debugger flags (e.g., `--require <bootloader>`) rather than appending to them.
2. **`npx jest` without `--experimental-vm-modules`** — `npx jest` does not inherit the flag from `package.json`'s `scripts.test`. The flag must be passed directly to `node`.

## Preferred Commands

### Run all tests (always safe)

```powershell
npm test
```

`package.json` already encodes the correct invocation:

```
node --experimental-vm-modules ./node_modules/jest/bin/jest.js --no-coverage
```

### Run with coverage

```powershell
npm run test:coverage
```

### Run a specific test file

```powershell
npm test -- --testPathPatterns="<relative-path-or-pattern>"
```

Example:

```powershell
npm test -- --testPathPatterns="manifest-editor"
```

> **Note:** `--testPathPattern` (singular) is deprecated in Jest ≥ 29.7. Use `--testPathPatterns` (plural).

### Run a specific test by name

```powershell
npm test -- --testNamePattern="<test name substring>"
```

### Run a specific test file directly (avoids VS Code NODE_OPTIONS conflicts)

```powershell
node --experimental-vm-modules ./node_modules/jest/bin/jest.js --no-coverage --testPathPatterns="<pattern>"
```

## What NOT to Do in PowerShell

```powershell
# ❌ Overwrites VS Code debugger NODE_OPTIONS — drops --require bootloader flags
$env:NODE_OPTIONS = "--experimental-vm-modules"; npx jest --no-coverage

# ❌ npx jest skips --experimental-vm-modules entirely when NODE_OPTIONS is unset
npx jest --no-coverage
```

## If You Must Append to NODE_OPTIONS

```powershell
# ✅ Appends without overwriting existing flags
$env:NODE_OPTIONS = "$env:NODE_OPTIONS --experimental-vm-modules"
node ./node_modules/jest/bin/jest.js --no-coverage
```

## Key Config References

- **`package.json` `scripts.test`**: `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --no-coverage`
- **`jest.config.ts`**: preset `ts-jest/presets/default-esm`, `extensionsToTreatAsEsm: ['.ts']`
- **Test files pattern**: `**/__tests__/**/*.test.ts`
