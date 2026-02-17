import { createWriteStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import yazl from 'yazl';

export async function createIdentityVsix(options?: {
  publisher?: string;
  extensionId?: string;
  version?: string;
}): Promise<{ vsixPath: string; cleanup: () => Promise<void> }> {
  const testDir = join(
    tmpdir(),
    `identity-vsix-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  await mkdir(testDir, { recursive: true });

  const vsixPath = join(testDir, 'test.vsix');
  const zipFile = new yazl.ZipFile();

  const manifest = {
    manifestVersion: 1,
    id: options?.extensionId ?? 'ext-from-vsix',
    publisher: options?.publisher ?? 'pub-from-vsix',
    version: options?.version ?? '1.0.0',
    name: 'Test Extension',
  };

  zipFile.addBuffer(Buffer.from(JSON.stringify(manifest, null, 2)), 'vss-extension.json');

  await new Promise<void>((resolve, reject) => {
    (zipFile.outputStream as any)
      .pipe(createWriteStream(vsixPath) as any)
      .on('finish', resolve)
      .on('error', reject);
    zipFile.end();
  });

  return {
    vsixPath,
    cleanup: async () => {
      await rm(testDir, { recursive: true, force: true });
    },
  };
}
