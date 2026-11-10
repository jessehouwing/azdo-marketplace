import { afterEach, describe, expect, it } from '@jest/globals';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
const require = createRequire(import.meta.url);
const yaml = require('js-yaml') as { load(content: string): unknown };
const execute = promisify(execFile);
const wrappers = [
  'package',
  'patch',
  'download-vsix',
  'publish',
  'unpublish',
  'share',
  'unshare',
  'install',
  'show',
  'query-version',
  'wait-for-validation',
  'wait-for-installation',
];

describe('release version rewriting', () => {
  let directory: string;

  afterEach(async () => {
    if (directory) {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('updates wrapper and provenance examples, preserves self references and is idempotent', async () => {
    directory = await mkdtemp(join(tmpdir(), 'release-version-test-'));
    const files = [
      'Scripts/update-version.mjs',
      'package.json',
      'packages/core/package.json',
      'packages/azdo-task/package.json',
      'packages/github-action/package.json',
      'packages/azdo-task/task.json',
      'packages/azdo-server-task/task.json',
      'vss-extension.json',
      'action.yml',
      'docs/vsix-provenance.md',
      ...wrappers.map((wrapper) => `${wrapper}/action.yaml`),
    ];
    for (const file of files) {
      const destination = join(directory, file);
      await mkdir(dirname(destination), { recursive: true });
      await cp(join(root, file), destination);
    }
    const script = join(directory, 'Scripts', 'update-version.mjs');
    await execute(process.execPath, [script, '6.99.42']);

    for (const wrapper of wrappers) {
      const content = await readFile(join(directory, wrapper, 'action.yaml'), 'utf8');
      const action = yaml.load(content) as { runs: { steps: Array<{ uses: string }> } };
      expect(action.runs.steps[0].uses).toBe('$/');
      const references = content.match(/jessehouwing\/azdo-marketplace@[^\s]+/g) || [];
      expect(
        references.every((reference) => reference === 'jessehouwing/azdo-marketplace@v6.99.42')
      ).toBe(true);
      if (wrapper === 'patch' || wrapper === 'download-vsix') {
        expect(references.length).toBeGreaterThan(0);
      }
    }
    const guide = await readFile(join(directory, 'docs', 'vsix-provenance.md'), 'utf8');
    expect(guide).toContain('jessehouwing/azdo-marketplace/patch@v6.99.42');
    expect(guide).toContain('jessehouwing/azdo-marketplace/download-vsix@v6.99.42');
    expect(guide).not.toMatch(/jessehouwing\/azdo-marketplace(?:\/[a-z-]+)?@v6(?![.\d])/);

    const before = await Promise.all(files.map((file) => readFile(join(directory, file), 'utf8')));
    await execute(process.execPath, [script, '6.99.42']);
    expect(await Promise.all(files.map((file) => readFile(join(directory, file), 'utf8')))).toEqual(
      before
    );
  });
});
