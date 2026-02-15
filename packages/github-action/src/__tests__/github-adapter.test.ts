import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GitHubAdapter } from '../github-adapter.js';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as io from '@actions/io';
import { TaskResult } from '@extension-tasks/core';

// Mock @actions modules
jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('@actions/tool-cache');
jest.mock('@actions/io');

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new GitHubAdapter();
  });

  describe('getInput', () => {
    it('should wrap core.getInput and return value', () => {
      const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
      mockGetInput.mockReturnValue('test-value');

      const result = adapter.getInput('testInput', false);

      expect(core.getInput).toHaveBeenCalledWith('testInput', { required: false });
      expect(result).toBe('test-value');
    });

    it('should return undefined for empty values', () => {
      const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
      mockGetInput.mockReturnValue('');

      const result = adapter.getInput('testInput', false);

      expect(result).toBeUndefined();
    });
  });

  describe('getBoolInput', () => {
    it('should wrap core.getBooleanInput', () => {
      const mockGetBooleanInput = core.getBooleanInput as jest.MockedFunction<typeof core.getBooleanInput>;
      mockGetBooleanInput.mockReturnValue(true);

      const result = adapter.getBoolInput('testBool', false);

      expect(core.getBooleanInput).toHaveBeenCalledWith('testBool', { required: false });
      expect(result).toBe(true);
    });
  });

  describe('getDelimitedInput', () => {
    it('should split delimited input into array', () => {
      const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
      mockGetInput.mockReturnValue('item1,item2,item3');

      const result = adapter.getDelimitedInput('testList', ',', false);

      expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('should trim whitespace from items', () => {
      const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
      mockGetInput.mockReturnValue(' item1 , item2 , item3 ');

      const result = adapter.getDelimitedInput('testList', ',', false);

      expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('should filter empty items', () => {
      const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
      mockGetInput.mockReturnValue('item1,,item2,');

      const result = adapter.getDelimitedInput('testList', ',', false);

      expect(result).toEqual(['item1', 'item2']);
    });
  });

  describe('setOutput', () => {
    it('should wrap core.setOutput', () => {
      adapter.setOutput('testOutput', 'test-value');

      expect(core.setOutput).toHaveBeenCalledWith('testOutput', 'test-value');
    });
  });

  describe('setResult', () => {
    it('should call core.info for succeeded result', () => {
      adapter.setResult(TaskResult.Succeeded, 'Task completed');

      expect(core.info).toHaveBeenCalledWith('✅ Task completed');
    });

    it('should call core.setFailed for failed result', () => {
      adapter.setResult(TaskResult.Failed, 'Task failed');

      expect(core.setFailed).toHaveBeenCalledWith('Task failed');
    });

    it('should call core.warning for other results', () => {
      adapter.setResult(TaskResult.Skipped, 'Task skipped');

      expect(core.warning).toHaveBeenCalledWith('Task skipped');
    });
  });

  describe('setVariable', () => {
    it('should export variable when isOutput is false', () => {
      adapter.setVariable('TEST_VAR', 'value', false, false);

      expect(core.exportVariable).toHaveBeenCalledWith('TEST_VAR', 'value');
    });

    it('should set output when isOutput is true', () => {
      adapter.setVariable('TEST_VAR', 'value', false, true);

      expect(core.setOutput).toHaveBeenCalledWith('TEST_VAR', 'value');
    });

    it('should mark as secret when isSecret is true', () => {
      adapter.setVariable('SECRET_VAR', 'secret-value', true, false);

      expect(core.setSecret).toHaveBeenCalledWith('secret-value');
      expect(core.exportVariable).toHaveBeenCalledWith('SECRET_VAR', 'secret-value');
    });
  });

  describe('setSecret', () => {
    it('should wrap core.setSecret', () => {
      adapter.setSecret('secret-value');

      expect(core.setSecret).toHaveBeenCalledWith('secret-value');
    });
  });

  describe('logging methods', () => {
    it('should wrap core.debug', () => {
      adapter.debug('debug message');
      expect(core.debug).toHaveBeenCalledWith('debug message');
    });

    it('should wrap core.info', () => {
      adapter.info('info message');
      expect(core.info).toHaveBeenCalledWith('info message');
    });

    it('should wrap core.warning', () => {
      adapter.warning('warning message');
      expect(core.warning).toHaveBeenCalledWith('warning message');
    });

    it('should wrap core.error', () => {
      adapter.error('error message');
      expect(core.error).toHaveBeenCalledWith('error message');
    });
  });

  describe('which', () => {
    it('should wrap io.which', async () => {
      const mockWhich = io.which as jest.MockedFunction<typeof io.which>;
      mockWhich.mockResolvedValue('/usr/bin/tool');

      const result = await adapter.which('tool', true);

      expect(io.which).toHaveBeenCalledWith('tool', true);
      expect(result).toBe('/usr/bin/tool');
    });
  });

  describe('exec', () => {
    it('should wrap exec.exec and return exit code', async () => {
      const mockExec = exec.exec as jest.MockedFunction<typeof exec.exec>;
      mockExec.mockResolvedValue(0);

      const result = await adapter.exec('tool', ['arg1', 'arg2']);

      expect(exec.exec).toHaveBeenCalledWith('tool', ['arg1', 'arg2'], undefined);
      expect(result).toBe(0);
    });

    it('should pass options to exec', async () => {
      const mockExec = exec.exec as jest.MockedFunction<typeof exec.exec>;
      mockExec.mockResolvedValue(0);

      const options = { silent: true, cwd: '/test' };
      await adapter.exec('tool', ['arg'], options);

      expect(exec.exec).toHaveBeenCalledWith('tool', ['arg'], options);
    });
  });
});
