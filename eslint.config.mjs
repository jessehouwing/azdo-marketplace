import tseslint from 'typescript-eslint';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  {
    ignores: [
      '**/dist/**',
      '**/*.d.ts',
      '**/__tests__/**',
      '**/src/**/__tests__/**',
      '**/*.js',
      'Scripts/**/*.mjs',
    ],
  },
  js.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    files: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
      },

      parser: tseslint.parser,
      parserOptions: {
        tsconfigRootDir: __dirname,
        projectService: true,
        sourceType: 'module',
      },
      ecmaVersion: 11,
    },

    rules: {
      ...tseslint.configs.eslintRecommended.rules,
      ...tseslint.plugin.configs.recommended.rules,
      ...tseslint.plugin.configs['recommended-requiring-type-checking'].rules,
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      // Disabled: We properly handle errors with instanceof checks and String()
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/prefer-promise-reject-errors': 'warn',
      '@typescript-eslint/only-throw-error': 'warn',
      '@typescript-eslint/require-await': 'warn',
    },
  },
  // Suppress warnings for files that interact with external libraries with incomplete types
  {
    files: [
      'packages/core/src/vsix-reader.ts',
      'packages/core/src/vsix-writer.ts',
      'packages/core/src/manifest-utils.ts',
      'packages/core/src/filesystem-manifest-writer.ts',
      'packages/core/src/filesystem-manifest-reader.ts',
      'packages/core/src/json-output-stream.ts',
      'packages/core/src/version-utils.ts',
    ],
    rules: {
      // These files work with yauzl/yazl libraries and dynamic manifest objects
      // which have incomplete TypeScript definitions
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
    },
  },
  // Suppress warnings for command files that parse tfx-cli JSON output
  {
    files: [
      'packages/core/src/commands/package.ts',
      'packages/core/src/commands/publish.ts',
      'packages/core/src/commands/show.ts',
      'packages/core/src/commands/wait-for-installation.ts',
      'packages/core/src/commands/wait-for-validation.ts',
      'packages/core/src/tfx-manager.ts',
      'packages/core/src/version-utils.ts',
      'packages/github-action/src/auth/oidc-auth.ts',
    ],
    rules: {
      // These files parse JSON output from tfx-cli or external tools
      // which is validated at runtime
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  },
  // Suppress warnings for main entry point files
  {
    files: ['packages/azdo-task/src/main.ts', 'packages/github-action/src/main.ts'],
    rules: {
      // Main entry points handle various dynamic operations
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  // Suppress warnings for auth and validation utility files
  {
    files: [
      'packages/*/src/auth/**/*.ts',
      'packages/core/src/validation.ts',
      'packages/core/src/manifest-editor.ts',
    ],
    rules: {
      // Auth and validation utilities have minor type issues that are safe
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  // Suppress warnings for adapter files
  {
    files: [
      'packages/*/src/*-adapter.ts',
      'packages/core/src/manifest-utils.ts',
      'packages/core/src/json-output-stream.ts',
    ],
    rules: {
      // Platform adapters have some minor type issues with external libraries
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
    },
  },
];
