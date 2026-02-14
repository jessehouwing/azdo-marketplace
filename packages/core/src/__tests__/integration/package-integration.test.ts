import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { packageExtension } from '../../commands/package.js';
import { MockPlatformAdapter } from '../helpers/mock-platform.js';
import { TfxManager } from '../../tfx-manager.js';
import { VsixReader } from '../../vsix-reader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Package Command Integration Test', () => {
  const fixturesDir = path.join(__dirname, 'fixtures', 'test-extension');
  const outputDir = path.join(__dirname, 'output');
  let platform: MockPlatformAdapter;

  beforeEach(async () => {
    platform = new MockPlatformAdapter();
    
    // Mock tfx tool location - use actual tfx from node_modules
    const tfxPath = path.resolve(__dirname, '../../../../../node_modules/tfx-cli/_build/tfx-cli.js');
    platform.setToolLocation('tfx', tfxPath);
    
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up output directory
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore errors
    }
  });

  it('should package extension from manifest and create valid VSIX', async () => {
    // Arrange
    const outputPath = path.join(outputDir, 'test.vsix');
    const tfx = new TfxManager({
      version: 'embedded',
      platform,
    });

    // Act
    const result = await packageExtension(
      {
        rootFolder: fixturesDir,
        manifestGlobs: ['vss-extension.json'],
        outputPath,
        bypassValidation: true,
      },
      tfx,
      platform
    );

    // Assert
    expect(result.vsixPath).toBe(outputPath);

    // Verify VSIX file exists
    const stats = await fs.stat(outputPath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);

    // Verify VSIX contents
    const reader = await VsixReader.open(outputPath);
    
    // Check extension vsix manifest
    const vsixManifest = await reader.readExtensionManifest();
    expect(vsixManifest).toBeDefined();
    // Basic validation - manifest is parsed successfully
    expect(typeof vsixManifest).toBe('object');

    // Check task manifest exists
    const taskManifests = await reader.getTasksInfo();
    expect(taskManifests).toHaveLength(1);
    expect(taskManifests[0].name).toBe('TestTask');
    expect(taskManifests[0].version).toBe('1.0.0');

    // Close reader
    await reader.close();

    // Verify no errors were logged
    const errors = platform.errorMessages.filter(
      (msg) => !msg.includes('warning')
    );
    expect(errors).toHaveLength(0);
  }, 60000); // 60 second timeout for package operation

  it('should create VSIX with correct structure', async () => {
    // Arrange
    const outputPath = path.join(outputDir, 'structured-test.vsix');
    const tfx = new TfxManager({
      version: 'embedded',
      platform,
    });

    // Act
    await packageExtension(
      {
        rootFolder: fixturesDir,
        manifestGlobs: ['vss-extension.json'],
        outputPath,
        bypassValidation: true,
      },
      tfx,
      platform
    );

    // Assert - Verify VSIX structure
    const reader = await VsixReader.open(outputPath);
    
    // Check for required files by reading them
    const vsixManifest = await reader.readExtensionManifest();
    expect(vsixManifest).toBeDefined();
    
    // Check task files exist
    const taskManifests = await reader.getTasksInfo();
    expect(taskManifests.length).toBeGreaterThan(0);

    await reader.close();
  }, 60000);

  it('should handle custom output variable', async () => {
    // Arrange
    const outputPath = path.join(outputDir, 'custom-var-test.vsix');
    const outputVariable = 'CustomVsixPath';
    const tfx = new TfxManager({
      version: 'embedded',
      platform,
    });

    // Act
    await packageExtension(
      {
        rootFolder: fixturesDir,
        manifestGlobs: ['vss-extension.json'],
        outputPath,
        outputVariable,
        bypassValidation: true,
      },
      tfx,
      platform
    );

    // Assert - Check output was set via setVariable
    // The command should set the variable as output
    const outputValue = platform.getVariable(outputVariable);
    expect(outputValue).toBe(outputPath);
  }, 60000);
});
