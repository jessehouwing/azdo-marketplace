# E2E Test Sample Extension

This is a sample Azure DevOps extension used for end-to-end testing of the Azure DevOps Extension Tasks.

## Purpose

This extension is designed to test all aspects of extension lifecycle management:
- Package creation
- Publishing to marketplace
- Sharing with organizations
- Installing to organizations
- Version management
- Task availability verification

## Structure

The extension includes:
- **2 sample tasks** (V1 and V2) with different versions for testing multi-task scenarios
- **Minimal viable implementation** to keep the extension lightweight
- **Valid extension manifest** following Azure DevOps extension schema

## Usage

This fixture is used by E2E test workflows in `.github/workflows/e2e/` to validate real-world scenarios that cannot be tested with unit tests alone.

### Testing Scenarios

1. **Package Operation**: Create a .vsix from this manifest
2. **Publish Operation**: Upload to marketplace (private publisher)
3. **Share Operation**: Share with test organizations
4. **Install Operation**: Install to test organizations
5. **Wait Operations**: Verify tasks become available after installation
6. **Version Updates**: Test automatic version incrementing
7. **Task ID Updates**: Test deterministic UUID generation

## Configuration

To use this fixture in your own tests:
1. Update the `publisher` field in `vss-extension.json` to your private publisher ID
2. Optionally update extension ID and task UUIDs
3. Run the E2E workflows with appropriate secrets configured

## Notes

- This extension is **not meant for production use**
- The tasks have minimal functionality (just console output)
- Icon is a 1x1 pixel transparent PNG (minimal size)
- All metadata is optimized for testing, not real-world usage
