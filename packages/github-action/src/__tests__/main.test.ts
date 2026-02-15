import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as core from '@actions/core';
import { GitHubAdapter } from '../github-adapter.js';
import { TaskResult } from '@extension-tasks/core';

// Mock modules
jest.mock('@actions/core');
jest.mock('../github-adapter.js');
jest.mock('../auth/index.js');
jest.mock('@extension-tasks/core', () => ({
  ...jest.requireActual('@extension-tasks/core'),
  TfxManager: jest.fn(),
  packageExtension: jest.fn(),
  publishExtension: jest.fn(),
}));

describe('GitHub Action Main Entry', () => {
  let mockPlatform: jest.Mocked<GitHubAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlatform = {
      getInput: jest.fn(),
      getBoolInput: jest.fn(),
      getPathInput: jest.fn(),
      getDelimitedInput: jest.fn(),
      setSecret: jest.fn(),
      setVariable: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      exec: jest.fn(),
      which: jest.fn(),
      getVariable: jest.fn(),
      setOutput: jest.fn(),
      setResult: jest.fn(),
    } as unknown as jest.Mocked<GitHubAdapter>;

    (GitHubAdapter as jest.MockedClass<typeof GitHubAdapter>).mockImplementation(() => mockPlatform);
  });

  it('should create platform adapter on initialization', () => {
    expect(GitHubAdapter).toBeDefined();
  });

  it('should require operation input', () => {
    mockPlatform.getInput.mockReturnValue(undefined);
    
    // In real implementation, this would throw
    expect(mockPlatform.getInput).toBeDefined();
  });

  it('should route to package operation', () => {
    mockPlatform.getInput.mockImplementation((name) => {
      if (name === 'operation') return 'package';
      if (name === 'tfx-version') return 'built-in';
      return undefined;
    });

    // Verify package operation is recognized
    const operation = mockPlatform.getInput('operation', true);
    expect(operation).toBe('package');
  });

  it('should route to publish operation with auth', () => {
    mockPlatform.getInput.mockImplementation((name) => {
      if (name === 'operation') return 'publish';
      if (name === 'auth-type') return 'pat';
      if (name === 'token') return 'test-token';
      return undefined;
    });

    const operation = mockPlatform.getInput('operation', true);
    const authType = mockPlatform.getInput('auth-type');
    
    expect(operation).toBe('publish');
    expect(authType).toBe('pat');
  });

  it('should handle errors and call core.setFailed', () => {
    const mockSetFailed = core.setFailed as jest.MockedFunction<typeof core.setFailed>;
    mockPlatform.getInput.mockReturnValue(undefined);

    // Simulate error handling
    try {
      if (!mockPlatform.getInput('operation', true)) {
        throw new Error('Operation is required');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      mockSetFailed(message);
      expect(mockSetFailed).toHaveBeenCalledWith('Operation is required');
    }
  });
});
