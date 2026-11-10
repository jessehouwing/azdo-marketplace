import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AuthCredentials } from '../auth.js';
import { downloadVsix } from '../commands/download-vsix.js';
import { patchExtension } from '../commands/patch.js';
import { publishExtension } from '../commands/publish.js';
import { TfxManager } from '../tfx-manager.js';
import { VsixReader } from '../vsix-reader.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

// Opt in with an actual release asset; normal test runs never need network access.
const releaseVsix = process.env.RELEASE_VSIX;
const integration = releaseVsix ? describe : describe.skip;

integration('released repository VSIX integration', () => {
  jest.setTimeout(180_000);
  let directory: string;

  afterEach(async () => {
    jest.restoreAllMocks();
    if (directory) {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('patches reproducibly, preserves every payload, publishes unchanged and downloads the original bytes', async () => {
    directory = await mkdtemp(join(tmpdir(), 'released-vsix-'));
    const platform = new MockPlatformAdapter();
    const digest = async (file: string) =>
      createHash('sha256')
        .update(await readFile(file))
        .digest('hex');
    const originalDigest = await digest(releaseVsix);
    const input = await VsixReader.open(releaseVsix);
    try {
      const metadata = await input.getMetadata();
      const tasks = await input.readTaskManifests();
      expect(tasks.length).toBeGreaterThan(0);
      const options = {
        vsixFile: releaseVsix,
        publisherId: 'integration-test',
        extensionId: `${metadata.extensionId}-pre`,
        extensionVersion: '6.9.99',
        extensionVisibility: 'private_preview' as const,
        updateTasksVersion: 'minor' as const,
        updateTasksId: true,
      };
      const first = await patchExtension(
        { ...options, outputPath: join(directory, 'first') },
        platform
      );
      await new Promise((resolve) => setTimeout(resolve, 2100));
      const second = await patchExtension(
        { ...options, outputPath: join(directory, 'second') },
        platform
      );
      expect(await digest(first.vsixFile)).toBe(await digest(second.vsixFile));
      expect(await digest(releaseVsix)).toBe(originalDigest);

      const patched = await VsixReader.open(first.vsixFile);
      try {
        expect(await patched.getMetadata()).toMatchObject({
          publisher: options.publisherId,
          extensionId: options.extensionId,
          version: '6.9.99',
        });
        const patchedTasks = await patched.readTaskManifests();
        expect(patchedTasks).toHaveLength(tasks.length);
        for (const task of tasks) {
          const updated = patchedTasks.find((entry) => entry.path === task.path);
          expect(updated.manifest.id).not.toBe(task.manifest.id);
          expect(updated.manifest.version).toEqual({
            Major: task.manifest.version.Major,
            Minor: 9,
            Patch: 99,
          });
        }
        const modifiedPaths = new Set([
          'extension.vsixmanifest',
          'extension.vsomanifest',
          'vss-extension.json',
          ...tasks.map((task) => `${task.path}/task.json`),
        ]);
        const files = await input.listFiles();
        expect(await patched.listFiles()).toHaveLength(files.length);
        for (const file of files) {
          if (!modifiedPaths.has(file.path)) {
            expect(await patched.readFile(file.path)).toEqual(await input.readFile(file.path));
          }
        }
      } finally {
        await patched.close();
      }

      const auth: AuthCredentials = {
        authType: 'pat',
        token: 'integration-placeholder',
        serviceUrl: 'https://marketplace.visualstudio.com',
      };
      const tfx = new TfxManager({ tfxVersion: 'built-in', platform });
      const execute = jest.spyOn(tfx, 'execute').mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
        json: { published: true },
      });
      const patchedDigest = await digest(first.vsixFile);
      await publishExtension(
        { publishSource: 'vsix', vsixFile: first.vsixFile },
        auth,
        tfx,
        platform
      );
      expect(execute.mock.calls[0][0]).toEqual(expect.arrayContaining(['--vsix', first.vsixFile]));
      expect(await digest(first.vsixFile)).toBe(patchedDigest);

      // Public query supplies the same metadata shape as authenticated tfx show.
      // Only that authenticated lookup is substituted; the asset download is real.
      const response = await fetch(
        'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.1-preview.1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: [
              {
                criteria: [
                  { filterType: 7, value: `${metadata.publisher}.${metadata.extensionId}` },
                ],
              },
            ],
            flags: 3,
          }),
        }
      );
      expect(response.ok).toBe(true);
      const query = (await response.json()) as { results: Array<{ extensions: unknown[] }> };
      execute.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
        json: query.results[0].extensions[0],
      });
      const downloaded = await downloadVsix(
        {
          publisherId: metadata.publisher,
          extensionId: metadata.extensionId,
          version: metadata.version,
          outputPath: join(directory, 'download'),
        },
        auth,
        tfx,
        platform
      );
      expect(await digest(downloaded.vsixFile)).toBe(originalDigest);
      console.info(
        `Release VSIX ${metadata.version}: original SHA-256 ${originalDigest}; deterministic patched SHA-256 ${patchedDigest}; ${tasks.length} tasks verified`
      );
    } finally {
      await input.close();
    }
  });
});
