import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  // Azure DevOps Task
  {
    input: path.join(__dirname, 'packages/azdo-task/src/main.ts'),
    output: {
      file: path.join(__dirname, 'packages/azdo-task/dist/bundle.js'),
      format: 'cjs',
      sourcemap: true,
    },
    external: [
      'azure-pipelines-task-lib',
      'azure-pipelines-tool-lib',
      'azure-pipelines-tasks-azure-arm-rest',
      'azure-devops-node-api',
    ],
    plugins: [
      typescript({
        tsconfig: path.join(__dirname, 'packages/azdo-task/tsconfig.json'),
        compilerOptions: {
          module: 'ESNext',
          declaration: false,
          declarationMap: false,
        },
      }),
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
    ],
  },
  // GitHub Action
  {
    input: path.join(__dirname, 'packages/github-action/src/main.ts'),
    output: {
      file: path.join(__dirname, 'packages/github-action/dist/bundle.js'),
      format: 'cjs',
      sourcemap: true,
    },
    external: ['@actions/core', '@actions/exec', '@actions/tool-cache', '@actions/io'],
    plugins: [
      typescript({
        tsconfig: path.join(__dirname, 'packages/github-action/tsconfig.json'),
        compilerOptions: {
          module: 'ESNext',
          declaration: false,
          declarationMap: false,
        },
      }),
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
    ],
  },
]);
