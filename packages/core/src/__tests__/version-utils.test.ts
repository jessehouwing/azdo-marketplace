import { describe, it, expect } from '@jest/globals';
import { parseVersion, incrementVersion, formatVersion } from '../version-utils.js';

describe('version-utils', () => {
  describe('parseVersion', () => {
    it('should parse 3-part version', () => {
      const version = parseVersion('1.2.3');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
      });
    });

    it('should parse 4-part version', () => {
      const version = parseVersion('1.2.3.4');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        revision: 4,
      });
    });

    it('should throw on invalid format', () => {
      expect(() => parseVersion('1.2')).toThrow('Invalid version format');
      expect(() => parseVersion('invalid')).toThrow('Invalid version format');
    });
  });

  describe('incrementVersion', () => {
    it('should increment major version', () => {
      expect(incrementVersion('1.2.3', 'major')).toBe('2.0.0');
    });

    it('should increment minor version', () => {
      expect(incrementVersion('1.2.3', 'minor')).toBe('1.3.0');
    });

    it('should increment patch version', () => {
      expect(incrementVersion('1.2.3', 'patch')).toBe('1.2.4');
    });

    it('should handle 4-part versions', () => {
      expect(incrementVersion('1.2.3.4', 'major')).toBe('2.0.0.4');
      expect(incrementVersion('1.2.3.4', 'minor')).toBe('1.3.0.4');
      expect(incrementVersion('1.2.3.4', 'patch')).toBe('1.2.4.4');
    });
  });

  describe('formatVersion', () => {
    it('should format 3-part version', () => {
      expect(formatVersion({ major: 1, minor: 2, patch: 3 })).toBe('1.2.3');
    });

    it('should format 4-part version', () => {
      expect(formatVersion({ major: 1, minor: 2, patch: 3, revision: 4 })).toBe('1.2.3.4');
    });
  });
});
