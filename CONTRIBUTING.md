# Contributing to Azure DevOps Extension Tasks

Thank you for your interest in contributing! This document provides information about the CI/CD workflows and development process.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run initdev
   ```
3. Build the tasks:
   ```bash
   npm run build
   ```
4. Run linting:
   ```bash
   npm run lint:tasks
   ```
5. Package the extension:
   ```bash
   npm run package
   npm run package:tasks
   ```

## CI/CD Workflows

This project uses both GitHub Actions and Azure Pipelines for continuous integration and deployment.

### GitHub Actions Workflows

#### CI Workflow (`.github/workflows/ci.yml`)
- **Triggers**: Push to `main`, Pull Requests
- **Purpose**: Build and package the extension
- **Platform**: Ubuntu Latest
- **Node Version**: 20.x
- **Steps**:
  1. Install dependencies
  2. Build tasks
  3. Lint code
  4. Package extension
  5. Upload VSIX artifact

#### Unit Tests Workflow (`.github/workflows/unit-tests.yml`)
- **Triggers**: Push to `main`, Pull Requests
- **Purpose**: Cross-platform testing
- **Platforms**: Ubuntu, Windows, macOS
- **Node Version**: 20.x
- **Steps**:
  1. Install dependencies
  2. Build tasks
  3. Run linting (Ubuntu only)

#### Integration Tests Workflow (`.github/workflows/integration-tests.yml`)
- **Triggers**: Push to `main`, Pull Requests, Manual dispatch
- **Purpose**: End-to-end testing of extension packaging
- **Platforms**: Ubuntu, Windows, macOS
- **Node Version**: 20.x
- **Steps**:
  1. Install tfx-cli globally
  2. Build and package extension
  3. Verify VSIX creation

#### Lint Workflow (`.github/workflows/lint.yml`)
- **Triggers**: Push to `main`, Pull Requests
- **Purpose**: Code quality checks
- **Platform**: Ubuntu Latest
- **Steps**: Run ESLint on all tasks

#### Check Build Output Workflow (`.github/workflows/check-dist.yml`)
- **Triggers**: Push to `main`, Pull Requests
- **Purpose**: Ensure compiled outputs are up-to-date
- **Platform**: Ubuntu Latest
- **Steps**:
  1. Build tasks
  2. Check for uncommitted changes
  3. Fail if build outputs are not committed

#### Release Workflow (`.github/workflows/release.yml`)
- **Triggers**: 
  - Git tags matching `v*.*.*`
  - Manual dispatch with version input
- **Purpose**: Automated releases to GitHub and marketplace
- **Stages**:
  1. **Build**: Create VSIX packages
  2. **Create Release**: Create GitHub release with artifacts
  3. **Publish to Marketplace**: (Placeholder - requires Azure DevOps credentials)
- **Requirements**: 
  - `GITHUB_TOKEN` for creating releases (automatically provided)
  - Azure DevOps service connection for marketplace publishing (manual setup required)

### Azure Pipelines Configuration (`azure-pipelines.yml`)

#### Build and Test Stage
- **Platform Matrix**: Windows, Linux, macOS
- **Node Version**: 20.x
- **Steps**:
  1. Install dependencies
  2. Build tasks
  3. Lint code
  4. Package extension
  5. Publish VSIX artifacts

#### Integration Tests Stage
- **Depends On**: Build stage
- **Platform Matrix**: Windows, Linux, macOS
- **Node Version**: 20.x
- **Steps**:
  1. Download VSIX artifacts
  2. Install tfx-cli
  3. Verify package integrity

#### Publish Dev Stage (Currently Disabled)
- **Condition**: Currently set to `false`
- **Purpose**: Publish to private marketplace for testing
- **To Enable**: Change condition to `and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))`
- **Requirements**: 
  - Azure DevOps service connection configured
  - Environment: `dev`

#### Publish Prod Stage (Currently Disabled)
- **Condition**: Currently set to `false`
- **Purpose**: Publish to public marketplace and create GitHub release
- **To Enable**: Change condition to `and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))`
- **Requirements**:
  - Azure DevOps service connection configured
  - GitHub service connection configured
  - Environment: `public-vsts-developer-tools-build-tasks`

## Testing Your Changes

### Local Testing
Before submitting a PR, ensure:
1. All tasks build successfully: `npm run build`
2. Linting passes (where supported): `npm run lint:tasks`
3. Extension packages successfully: `npm run package && npm run package:tasks`

### Cross-Platform Testing
The CI/CD workflows automatically test on:
- **Ubuntu Latest** (Linux)
- **Windows Latest** 
- **macOS Latest**

You can run the workflows locally using tools like [act](https://github.com/nektos/act) for GitHub Actions.

## Release Process

### Manual Release (Recommended)
1. Create a new version tag:
   ```bash
   git tag -a v5.0.1 -m "Release v5.0.1"
   git push origin v5.0.1
   ```
2. The release workflow will automatically:
   - Build VSIX packages
   - Create a GitHub release
   - Upload artifacts

### Automated Release
The release workflow can also be triggered manually from GitHub Actions:
1. Go to Actions → Release
2. Click "Run workflow"
3. Enter the version number (e.g., `5.0.1`)

### Marketplace Publishing
Marketplace publishing is currently a placeholder. To enable:
1. Set up Azure DevOps service connection
2. Configure authentication (PAT or Azure RM)
3. Update the release workflow with actual credentials

## Troubleshooting

### Build Failures
- Ensure all dependencies are installed: `npm run initdev`
- Clear node_modules and reinstall if needed: `npm run clean && npm run initdev`

### Lint Failures
- The lint command has known issues with glob-exec command parsing
- Run linting manually per task if needed

### VSIX Package Not Created
- Ensure build completed successfully
- Check `dist/` directory for output
- Verify manifest files are correct

## Additional Resources

- [Azure DevOps Extension Documentation](https://docs.microsoft.com/en-us/azure/devops/extend/)
- [tfx-cli Documentation](https://github.com/microsoft/tfs-cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Pipelines Documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/)
