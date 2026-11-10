import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import yazl from 'yazl';
import { patchExtension } from '../commands/patch.js';
import { VsixReader } from '../vsix-reader.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

describe('patchExtension', () => {
  let directory: string;
  let input: string;
  const platform = new MockPlatformAdapter();

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'patch-test-'));
    input = join(directory, 'input.vsix');
    const zip = new yazl.ZipFile();
    zip.addBuffer(
      Buffer.from(
        JSON.stringify({
          manifestVersion: 1,
          contributions: [
            { id: 'task', type: 'ms.vss-distributed-task.task', properties: { name: 'Task' } },
          ],
        })
      ),
      'extension.vsomanifest'
    );
    zip.addBuffer(
      Buffer.from(
        '<PackageManifest><Metadata><Identity Id="extension" Publisher="publisher" Version="1.2.3"/><DisplayName>Original</DisplayName><GalleryFlags>Public</GalleryFlags></Metadata></PackageManifest>'
      ),
      'extension.vsixmanifest'
    );
    zip.addBuffer(
      Buffer.from(
        JSON.stringify({
          id: 'b310bcce-c30d-45cd-a01f-5e69b674a156',
          name: 'Task',
          version: { Major: 1, Minor: 2, Patch: 3 },
        })
      ),
      'Task/task.json'
    );
    zip.addBuffer(Buffer.from([0, 255, 17, 18]), 'Task/binary.dat');
    const writing = pipeline(zip.outputStream, createWriteStream(input));
    zip.end();
    await writing;
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('patches identity, XML visibility, pricing and task manifests while preserving payload and input', async () => {
    const original = await readFile(input);
    const result = await patchExtension(
      {
        vsixFile: input,
        outputPath: join(directory, 'output'),
        publisherId: 'new-publisher',
        extensionId: 'extension-pre',
        extensionVersion: '4.5.6',
        extensionName: 'Preview',
        extensionVisibility: 'private_preview',
        extensionPricing: 'free',
        updateTasksVersion: 'minor',
        updateTasksId: true,
      },
      platform
    );
    expect(result.vsixFile).toBe(
      join(directory, 'output', 'new-publisher.extension-pre-4.5.6.vsix')
    );
    expect(await readFile(input)).toEqual(original);
    const reader = await VsixReader.open(result.vsixFile);
    try {
      expect(await reader.getMetadata()).toMatchObject({
        publisher: 'new-publisher',
        extensionId: 'extension-pre',
        version: '4.5.6',
      });
      const xml = (await reader.readFile('extension.vsixmanifest')).toString();
      expect(xml).toContain('<DisplayName>Preview</DisplayName>');
      expect(xml).toContain('Private Preview');
      const tasks = await reader.readTaskManifests();
      expect(tasks[0].manifest.version).toEqual({ Major: 1, Minor: 5, Patch: 6 });
      expect(tasks[0].manifest.id).not.toBe('b310bcce-c30d-45cd-a01f-5e69b674a156');
      expect(await reader.readFile('Task/binary.dat')).toEqual(Buffer.from([0, 255, 17, 18]));
      expect(xml).toContain('Free');
    } finally {
      await reader.close();
    }
  });

  it('produces identical SHA-256 digests with identical edits at different times', async () => {
    const options = { vsixFile: input, extensionId: 'extension-pre', updateTasksId: true };
    const first = await patchExtension(
      { ...options, outputPath: join(directory, 'first') },
      platform
    );
    // ZIP DOS timestamps have two-second resolution.
    await new Promise((resolve) => setTimeout(resolve, 2100));
    const second = await patchExtension(
      { ...options, outputPath: join(directory, 'second') },
      platform
    );
    const digest = async (file: string) =>
      createHash('sha256')
        .update(await readFile(file))
        .digest('hex');
    expect(await digest(first.vsixFile)).toBe(await digest(second.vsixFile));
  });

  it('supports an unchanged identity and replacing an existing output, including its input', async () => {
    const first = await patchExtension({ vsixFile: input, outputPath: directory }, platform);
    const second = await patchExtension(
      { vsixFile: first.vsixFile, outputPath: directory },
      platform
    );
    expect(second.vsixFile).toBe(first.vsixFile);
    expect(await readdir(directory)).toEqual(
      expect.arrayContaining(['input.vsix', 'publisher.extension-1.2.3.vsix'])
    );
    expect((await readdir(directory)).some((name) => name.startsWith('.patch-'))).toBe(false);
  });

  it('fails clearly for a missing input', async () => {
    await expect(
      patchExtension({ vsixFile: join(directory, 'missing.vsix') }, platform)
    ).rejects.toThrow();
  });

  it('cleans up staging files and preserves the input if the final write fails', async () => {
    const original = await readFile(input);
    const destination = join(directory, 'publisher.extension-1.2.3.vsix');
    await mkdir(destination);
    await writeFile(join(destination, 'sentinel'), 'keep');
    await expect(
      patchExtension({ vsixFile: input, outputPath: directory }, platform)
    ).rejects.toThrow();
    expect(await readFile(input)).toEqual(original);
    expect(await readFile(join(destination, 'sentinel'), 'utf8')).toBe('keep');
    expect((await readdir(directory)).some((name) => name.startsWith('.patch-'))).toBe(false);
  });
});
