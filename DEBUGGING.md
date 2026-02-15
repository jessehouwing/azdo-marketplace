# Debugging Guide

This guide explains how to debug the Azure DevOps Extension Tasks locally using VSCode.

## Table of Contents

- [Prerequisites](#prerequisites)
- [VSCode Debugging](#vscode-debugging)
  - [GitHub Actions](#debugging-github-actions)
  - [Azure Pipelines Tasks](#debugging-azure-pipelines-tasks)
  - [Unit Tests](#debugging-unit-tests)
- [Local Action Testing](#local-action-testing)
- [Environment Setup](#environment-setup)
- [Common Issues](#common-issues)

## Prerequisites

1. **VSCode** with recommended extensions installed
2. **Node.js 20+** installed
3. **Dependencies installed**: Run `npm install` in the repository root
4. **Project built**: Run `npm run build:v6` to build all packages
5. **Marketplace Token** (for authenticated operations): Set `MARKETPLACE_TOKEN` environment variable

## VSCode Debugging

### Debugging GitHub Actions

The repository includes several pre-configured debug configurations for GitHub Actions:

#### 1. Debug GitHub Action - Package

Tests the package operation (no authentication required):

1. Open VSCode
2. Go to Run and Debug (Ctrl+Shift+D / Cmd+Shift+D)
3. Select "Debug GitHub Action - Package"
4. Press F5 to start debugging

**Configuration**:
- Entry point: `packages/github-action/src/main.ts`
- Operation: package
- Test extension: Uses fixtures in `packages/core/src/__tests__/integration/fixtures/test-extension`
- Output: Creates VSIX in `./dist`

#### 2. Debug GitHub Action - Publish

Tests the publish operation (requires authentication):

1. Set your marketplace token: `export MARKETPLACE_TOKEN=your-token`
2. Edit the launch configuration to set your publisher-id and extension-id
3. Select "Debug GitHub Action - Publish"
4. Press F5 to start debugging

**Configuration**:
- Entry point: `packages/github-action/src/main.ts`
- Operation: publish
- Authentication: PAT (reads from MARKETPLACE_TOKEN env var)
- Requires: Valid publisher and extension IDs

#### 3. Debug GitHub Action - Show

Tests the show operation to display extension metadata:

1. Set your marketplace token: `export MARKETPLACE_TOKEN=your-token`
2. Edit the launch configuration to set publisher-id and extension-id
3. Select "Debug GitHub Action - Show"
4. Press F5 to start debugging

**Customizing GitHub Action Debug Configs**:

Edit `.vscode/launch.json` and modify the `env` section:

```json
{
  "env": {
    "INPUT_OPERATION": "package",           // Change operation
    "INPUT_ROOT-FOLDER": "path/to/extension", // Change extension path
    "INPUT_PUBLISHER-ID": "your-publisher",  // Your publisher
    "INPUT_EXTENSION-ID": "your-extension",  // Your extension
    "INPUT_TOKEN": "${env:MARKETPLACE_TOKEN}" // Uses env variable
  }
}
```

### Debugging Azure Pipelines Tasks

The repository includes several pre-configured debug configurations for Azure Pipelines tasks:

#### 1. Debug Azure Pipelines Task - Package

Tests the package operation:

1. Select "Debug Azure Pipelines Task - Package"
2. Press F5 to start debugging

**Configuration**:
- Entry point: `packages/azdo-task/src/main.ts`
- Operation: package
- Uses fixtures for testing
- No authentication required

#### 2. Debug Azure Pipelines Task - Publish (PAT)

Tests the publish operation with PAT authentication:

1. Set your marketplace token: `export MARKETPLACE_TOKEN=your-token`
2. Edit the launch configuration to set your publisher and extension
3. Select "Debug Azure Pipelines Task - Publish (PAT)"
4. Press F5 to start debugging

**Configuration**:
- Entry point: `packages/azdo-task/src/main.ts`
- Operation: publish
- Authentication: PAT via service endpoint simulation
- Requires: Valid publisher and extension IDs

#### 3. Debug Azure Pipelines Task - Show

Tests the show operation:

1. Set your marketplace token: `export MARKETPLACE_TOKEN=your-token`
2. Edit configuration as needed
3. Select "Debug Azure Pipelines Task - Show"
4. Press F5 to start debugging

**Customizing Azure Pipelines Debug Configs**:

Edit `.vscode/launch.json` and modify the `env` section:

```json
{
  "env": {
    "INPUT_OPERATION": "package",
    "INPUT_PUBLISHERID": "your-publisher",
    "INPUT_EXTENSIONID": "your-extension",
    "ENDPOINT_AUTH_PARAMETER_MarketplaceConnection_APITOKEN": "${env:MARKETPLACE_TOKEN}"
  }
}
```

**Note**: Azure Pipelines uses different environment variable patterns:
- Inputs: `INPUT_<UPPERCASENAME>` (e.g., `INPUT_PUBLISHERID`)
- Service endpoints: `ENDPOINT_*` patterns
- Agent variables: `AGENT_*` patterns

### Debugging Unit Tests

To debug specific tests:

1. Select "Debug Tests" configuration
2. Press F5
3. Enter a test name pattern when prompted (or leave empty for all tests)

**Examples**:
- Empty: Runs all tests
- `package`: Runs tests with "package" in the name
- `tfx-manager`: Runs tfx-manager tests

**Alternatively**, use VSCode Jest extension:
1. Install "Jest" extension (recommended in extensions.json)
2. Click the debug icon next to any test in the editor
3. Tests will run with breakpoints active

## Local Action Testing

For testing GitHub Actions in a Docker container (similar to actual GitHub Actions runners):

### Setup

1. Clone and build local-action:
   ```bash
   git clone https://github.com/github/local-action.git ~/local-action
   cd ~/local-action
   npm install
   npm run build
   ```

2. Build this project:
   ```bash
   cd /path/to/azure-devops-extension-tasks
   npm install
   npm run build:v6
   npm run bundle  # Optional: test with bundled code
   ```

### Run Local Action

See [.github/local-action/README.md](.github/local-action/README.md) for detailed instructions and examples.

**Quick example**:
```bash
cd ~/local-action
./run.sh \
  --action /path/to/azure-devops-extension-tasks \
  --env INPUT_OPERATION=package \
  --env INPUT_ROOT-FOLDER=./packages/core/src/__tests__/integration/fixtures/test-extension \
  --env INPUT_OUTPUT-PATH=./dist
```

## Environment Setup

### Required Environment Variables

#### For GitHub Actions:
- `INPUT_*` - Action inputs (uppercase, hyphens as-is)
- `RUNNER_TEMP` - Temp directory (defaults to `.tmp`)
- `RUNNER_TOOL_CACHE` - Tool cache directory (defaults to `.cache`)
- `GITHUB_WORKSPACE` - Workspace directory (optional)

#### For Azure Pipelines:
- `INPUT_*` - Task inputs (uppercase, no hyphens)
- `AGENT_TEMPDIRECTORY` - Temp directory
- `AGENT_TOOLSDIRECTORY` - Tool cache directory
- `ENDPOINT_*` - Service endpoint configuration

### Authentication

Set marketplace token in your environment:

```bash
# Linux/Mac
export MARKETPLACE_TOKEN="your-token-here"

# Windows PowerShell
$env:MARKETPLACE_TOKEN = "your-token-here"

# Windows CMD
set MARKETPLACE_TOKEN=your-token-here
```

**Generate a token**:
1. Go to https://marketplace.visualstudio.com/manage/publishers/
2. Select your publisher
3. Create a Personal Access Token with marketplace publish permissions

## Common Issues

### Issue: "Cannot find module"

**Solution**: Build the project first
```bash
npm install
npm run build:v6
```

### Issue: "Authentication failed"

**Solution**: Check your token
```bash
# Verify token is set
echo $MARKETPLACE_TOKEN

# Test with a simple operation
npm run build:v6
# Then use debug config for "Show" operation
```

### Issue: "VSIX file not found"

**Solution**: Check paths in debug configuration
- Use absolute paths or ensure working directory is correct
- Verify test fixtures exist

### Issue: Breakpoints not hitting

**Solution**: 
1. Ensure source maps are generated: Check `tsconfig.json` has `"sourceMap": true`
2. Rebuild the project: `npm run build:v6`
3. Check outFiles in launch.json matches build output

### Issue: "tfx command not found"

**Solution**: The task should download tfx automatically. If not:
```bash
# Install tfx globally
npm install -g tfx-cli

# Or specify version in input
INPUT_TFX-VERSION=latest
```

## Tips

1. **Start Simple**: Begin with the package operation (no auth required)
2. **Check Logs**: Use `platform.debug()` statements for detailed logging
3. **Use Breakpoints**: Set breakpoints in commands and auth providers
4. **Test Fixtures**: Modify fixtures in `packages/core/src/__tests__/integration/fixtures/` for testing
5. **Environment**: Use `.env` file or shell rc file for persistent environment variables
6. **Bundle**: Run `npm run bundle` to test with production-like bundles

## Resources

- [VSCode Debugging Documentation](https://code.visualstudio.com/docs/editor/debugging)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Pipelines Documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/)
- [GitHub Local Action](https://github.com/github/local-action)
