import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AuthCredentials } from '../auth.js';
import { downloadVsix } from '../commands/download-vsix.js';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

describe('downloadVsix', () => {
  let directory: string;
  let platform: MockPlatformAdapter;
  let tfx: TfxManager;
  const auth: AuthCredentials = {
    authType: 'pat',
    token: 'secret',
    serviceUrl: 'https://marketplace.visualstudio.com',
  };
  const content = Buffer.from([0x50, 0x4b, 3, 4, 1, 2, 3]);
  const assetUrl = 'https://publisher.gallery.vsassets.io/extension.vsix';
  const metadata = {
    versions: [
      {
        version: '2.0.0',
        files: [{ assetType: 'Microsoft.VisualStudio.Services.VSIXPackage', source: assetUrl }],
      },
      {
        version: '1.0.0',
        files: [
          { assetType: 'Microsoft.VisualStudio.Services.VSIXPackage', source: `${assetUrl}?old` },
        ],
      },
    ],
  };
  const options = () => ({
    publisherId: 'publisher',
    extensionId: 'extension',
    outputPath: directory,
  });

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'download-vsix-test-'));
    platform = new MockPlatformAdapter();
    tfx = new TfxManager({ tfxVersion: 'built-in', platform });
    jest
      .spyOn(tfx, 'execute')
      .mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', json: metadata });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(content));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  it.each([undefined, 'latest'])(
    'downloads latest (%s) with no authentication on the asset request',
    async (version) => {
      const result = await downloadVsix({ ...options(), version }, auth, tfx, platform);
      expect(result.vsixFile).toBe(join(directory, 'publisher.extension-2.0.0.vsix'));
      expect(await readFile(result.vsixFile)).toEqual(content);
      expect(fetch).toHaveBeenCalledWith(new URL(assetUrl));
      expect(platform.isSecret('secret')).toBe(true);
      expect(await readdir(directory)).toEqual(['publisher.extension-2.0.0.vsix']);
    }
  );

  it('selects an exact version rather than downloading latest', async () => {
    const result = await downloadVsix({ ...options(), version: '1.0.0' }, auth, tfx, platform);
    expect(result.vsixFile).toContain('1.0.0.vsix');
    expect(fetch).toHaveBeenCalledWith(new URL(`${assetUrl}?old`));
  });

  it('rejects a missing version without fetching', async () => {
    await expect(
      downloadVsix({ ...options(), version: '3.0.0' }, auth, tfx, platform)
    ).rejects.toThrow("version '3.0.0' not found");
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a missing VSIX asset', async () => {
    jest.mocked(tfx.execute).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
      json: { versions: [{ version: '1.0.0', files: [] }] },
    });
    await expect(downloadVsix(options(), auth, tfx, platform)).rejects.toThrow(
      'VSIXPackage asset missing'
    );
  });

  it.each(['', '<html>Not authorized</html>', 'PK'])(
    'rejects non-ZIP content (%s) without leaving an output',
    async (body) => {
      jest.mocked(fetch).mockResolvedValue(new Response(body));
      await expect(downloadVsix(options(), auth, tfx, platform)).rejects.toThrow(
        'invalid magic bytes'
      );
      expect(await readdir(directory)).toEqual([]);
    }
  );

  it('reports an HTTP download failure', async () => {
    jest.mocked(fetch).mockResolvedValue(new Response('Not found', { status: 404 }));
    await expect(downloadVsix(options(), auth, tfx, platform)).rejects.toThrow('HTTP 404');
  });

  it('propagates metadata errors without downloading', async () => {
    jest.mocked(tfx.execute).mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'Unauthorized' });
    await expect(downloadVsix(options(), auth, tfx, platform)).rejects.toThrow('Unauthorized');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects insecure asset URLs', async () => {
    jest.mocked(tfx.execute).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
      json: {
        versions: [
          {
            version: '1.0.0',
            files: [
              {
                assetType: 'Microsoft.VisualStudio.Services.VSIXPackage',
                source: 'http://example.com/file',
              },
            ],
          },
        ],
      },
    });
    await expect(downloadVsix(options(), auth, tfx, platform)).rejects.toThrow('HTTPS');
    expect(fetch).not.toHaveBeenCalled();
  });
});
