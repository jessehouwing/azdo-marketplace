import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'Node16',
          moduleResolution: 'Node16',
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.test.ts',
    '!packages/*/src/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  projects: [
    {
      displayName: 'core',
      testMatch: ['<rootDir>/packages/core/src/**/*.test.ts'],
    },
    {
      displayName: 'azdo-task',
      testMatch: ['<rootDir>/packages/azdo-task/src/**/*.test.ts'],
    },
    {
      displayName: 'github-action',
      testMatch: ['<rootDir>/packages/github-action/src/**/*.test.ts'],
    },
  ],
};

export default config;
