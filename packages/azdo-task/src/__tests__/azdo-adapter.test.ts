import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AzdoAdapter } from '../azdo-adapter.js';
import * as tl from 'azure-pipelines-task-lib/task.js';

// Mock azure-pipelines-task-lib
jest.mock('azure-pipelines-task-lib/task.js');

describe('AzdoAdapter', () => {
  let adapter: AzdoAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new AzdoAdapter();
  });

  describe('getInput', () => {
    it('should wrap tl.getInput', () => {
      const mockGetInput = tl.getInput as jest.MockedFunction<typeof tl.getInput>;
      mockGetInput.mockReturnValue('test-value');

      const result = adapter.getInput('testInput', false);

      expect(tl.getInput).toHaveBeenCalledWith('testInput', false);
      expect(result).toBe('test-value');
    });

    it('should pass required flag correctly', () => {
      const mockGetInput = tl.getInput as jest.MockedFunction<typeof tl.getInput>;
      mockGetInput.mockReturnValue('value');

      adapter.getInput('testInput', true);

      expect(tl.getInput).toHaveBeenCalledWith('testInput', true);
    });
  });

  describe('getBoolInput', () => {
    it('should wrap tl.getBoolInput', () => {
      const mockGetBoolInput = tl.getBoolInput as jest.MockedFunction<typeof tl.getBoolInput>;
      mockGetBoolInput.mockReturnValue(true);

      const result = adapter.getBoolInput('testBool', false);

      expect(tl.getBoolInput).toHaveBeenCalledWith('testBool', false);
      expect(result).toBe(true);
    });

    it('should handle false values', () => {
      const mockGetBoolInput = tl.getBoolInput as jest.MockedFunction<typeof tl.getBoolInput>;
      mockGetBoolInput.mockReturnValue(false);

      const result = adapter.getBoolInput('testBool', false);

      expect(result).toBe(false);
    });
  });

  describe('getPathInput', () => {
    it('should wrap tl.getPathInput', () => {
      const mockGetPathInput = tl.getPathInput as jest.MockedFunction<typeof tl.getPathInput>;
      mockGetPathInput.mockReturnValue('/test/path');

      const result = adapter.getPathInput('testPath', false, false);

      expect(tl.getPathInput).toHaveBeenCalledWith('testPath', false, false);
      expect(result).toBe('/test/path');
    });
  });

  describe('getDelimitedInput', () => {
    it('should wrap tl.getDelimitedInput', () => {
      const mockGetDelimitedInput = tl.getDelimitedInput as jest.MockedFunction<
        typeof tl.getDelimitedInput
      >;
      mockGetDelimitedInput.mockReturnValue(['item1', 'item2']);

      const result = adapter.getDelimitedInput('testList', ',', false);

      expect(tl.getDelimitedInput).toHaveBeenCalledWith('testList', ',', false);
      expect(result).toEqual(['item1', 'item2']);
    });
  });

  describe('setSecret', () => {
    it('should wrap tl.setSecret', () => {
      const mockSetSecret = tl.setSecret as jest.MockedFunction<typeof tl.setSecret>;

      adapter.setSecret('my-secret');

      expect(tl.setSecret).toHaveBeenCalledWith('my-secret');
      expect(tl.setSecret).toHaveBeenCalledTimes(1);
    });

    it('should mask empty secrets', () => {
      const mockSetSecret = tl.setSecret as jest.MockedFunction<typeof tl.setSecret>;

      adapter.setSecret('');

      expect(tl.setSecret).toHaveBeenCalledWith('');
    });
  });

  describe('setVariable', () => {
    it('should wrap tl.setVariable', () => {
      const mockSetVariable = tl.setVariable as jest.MockedFunction<typeof tl.setVariable>;

      adapter.setVariable('myVar', 'myValue', false, true);

      expect(tl.setVariable).toHaveBeenCalledWith('myVar', 'myValue', false, true);
    });
  });

  describe('Logging methods', () => {
    it('info should wrap tl.debug', () => {
      const mockDebug = tl.debug as jest.MockedFunction<typeof tl.debug>;

      adapter.info('info message');

      expect(tl.debug).toHaveBeenCalledWith('info message');
    });

    it('warning should wrap tl.warning', () => {
      const mockWarning = tl.warning as jest.MockedFunction<typeof tl.warning>;

      adapter.warning('warning message');

      expect(tl.warning).toHaveBeenCalledWith('warning message');
    });

    it('error should wrap tl.error', () => {
      const mockError = tl.error as jest.MockedFunction<typeof tl.error>;

      adapter.error('error message');

      expect(tl.error).toHaveBeenCalledWith('error message');
    });

    it('debug should wrap tl.debug', () => {
      const mockDebug = tl.debug as jest.MockedFunction<typeof tl.debug>;

      adapter.debug('debug message');

      expect(tl.debug).toHaveBeenCalledWith('debug message');
    });
  });

  describe('exec', () => {
    it('should wrap tl.exec and return exit code', async () => {
      const mockExec = tl.exec as jest.MockedFunction<typeof tl.exec>;
      mockExec.mockResolvedValue(0);

      const result = await adapter.exec('npm', ['install']);

      expect(tl.exec).toHaveBeenCalledWith('npm', ['install'], undefined);
      expect(result).toBe(0);
    });

    it('should pass options to tl.exec', async () => {
      const mockExec = tl.exec as jest.MockedFunction<typeof tl.exec>;
      mockExec.mockResolvedValue(0);
      const options = { cwd: '/test' };

      await adapter.exec('npm', ['test'], options);

      expect(tl.exec).toHaveBeenCalledWith('npm', ['test'], options);
    });

    it('should handle non-zero exit codes', async () => {
      const mockExec = tl.exec as jest.MockedFunction<typeof tl.exec>;
      mockExec.mockResolvedValue(1);

      const result = await adapter.exec('npm', ['test']);

      expect(result).toBe(1);
    });
  });

  describe('which', () => {
    it('should wrap tl.which', async () => {
      const mockWhich = tl.which as jest.MockedFunction<typeof tl.which>;
      mockWhich.mockReturnValue('/usr/bin/npm');

      const result = await adapter.which('npm', false);

      expect(tl.which).toHaveBeenCalledWith('npm', false);
      expect(result).toBe('/usr/bin/npm');
    });

    it('should handle required flag', async () => {
      const mockWhich = tl.which as jest.MockedFunction<typeof tl.which>;
      mockWhich.mockReturnValue('/usr/bin/node');

      await adapter.which('node', true);

      expect(tl.which).toHaveBeenCalledWith('node', true);
    });
  });

  describe('getVariable', () => {
    it('should wrap tl.getVariable', () => {
      const mockGetVariable = tl.getVariable as jest.MockedFunction<typeof tl.getVariable>;
      mockGetVariable.mockReturnValue('variable-value');

      const result = adapter.getVariable('MY_VAR');

      expect(tl.getVariable).toHaveBeenCalledWith('MY_VAR');
      expect(result).toBe('variable-value');
    });

    it('should handle undefined variables', () => {
      const mockGetVariable = tl.getVariable as jest.MockedFunction<typeof tl.getVariable>;
      mockGetVariable.mockReturnValue(undefined);

      const result = adapter.getVariable('MISSING_VAR');

      expect(result).toBeUndefined();
    });
  });

  describe('setOutput', () => {
    it('should wrap setVariable with output flag', () => {
      const mockSetVariable = tl.setVariable as jest.MockedFunction<typeof tl.setVariable>;

      adapter.setOutput('outputName', 'outputValue');

      expect(tl.setVariable).toHaveBeenCalledWith('outputName', 'outputValue', false, true);
    });
  });

  describe('Integration behavior', () => {
    it('should allow chaining multiple calls', () => {
      const mockGetInput = tl.getInput as jest.MockedFunction<typeof tl.getInput>;
      const mockSetSecret = tl.setSecret as jest.MockedFunction<typeof tl.setSecret>;
      const mockDebug = tl.debug as jest.MockedFunction<typeof tl.debug>;

      mockGetInput.mockReturnValue('value');

      const value = adapter.getInput('test', false);
      adapter.setSecret(value);
      adapter.info('Set secret');

      expect(mockGetInput).toHaveBeenCalled();
      expect(mockSetSecret).toHaveBeenCalledWith('value');
      expect(mockDebug).toHaveBeenCalledWith('Set secret');
    });
  });
});
