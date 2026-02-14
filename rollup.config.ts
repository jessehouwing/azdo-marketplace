import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig([
  // Azure DevOps Task
  {
    input: 'packages/azdo-task/src/main.ts',
    output: {
      file: 'packages/azdo-task/dist/bundle.js',
      format: 'cjs',
      sourcemap: true,
    },
    external: [
      'azure-pipelines-task-lib',
      'azure-pipelines-tool-lib',
      'azure-arm-rest',
      'azure-devops-node-api',
    ],
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: 'packages/azdo-task/tsconfig.json',
      }),
    ],
  },
  // GitHub Action
  {
    input: 'packages/github-action/src/main.ts',
    output: {
      file: 'packages/github-action/dist/bundle.js',
      format: 'cjs',
      sourcemap: true,
    },
    external: ['@actions/core', '@actions/exec', '@actions/tool-cache', '@actions/io'],
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: 'packages/github-action/tsconfig.json',
      }),
    ],
  },
]);
