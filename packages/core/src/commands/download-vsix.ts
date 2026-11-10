import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { AuthCredentials } from '../auth.js';
import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';
import { validateExtensionId, validatePublisherId, validateVersion } from '../validation.js';
import { showExtension } from './show.js';

/** Marketplace identity and version to download. */
export interface DownloadVsixOptions {
  publisherId: string;
  extensionId: string;
  version?: string;
  outputPath?: string;
}

/** Download the public VSIX asset without forwarding marketplace credentials. */
export async function downloadVsix(
  options: DownloadVsixOptions,
  auth: AuthCredentials,
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<{ vsixFile: string }> {
  validatePublisherId(options.publisherId);
  validateExtensionId(options.extensionId);
  if (options.version && options.version !== 'latest') {
    validateVersion(options.version);
  }
  const { metadata } = await showExtension(options, auth, tfx, platform);
  const versions = metadata.versions || [];
  const selected =
    !options.version || options.version === 'latest'
      ? versions[0]
      : versions.find((entry) => entry.version === options.version);
  if (!selected) {
    throw new Error(
      `Marketplace version '${options.version || 'latest'}' not found for ${options.publisherId}.${options.extensionId}`
    );
  }
  validateVersion(selected.version);
  const asset = selected.files?.find(
    (file) => file.assetType === 'Microsoft.VisualStudio.Services.VSIXPackage'
  );
  if (!asset?.source) {
    throw new Error(`VSIXPackage asset missing for marketplace version '${selected.version}'`);
  }
  const url = new URL(asset.source);
  if (url.protocol !== 'https:') {
    throw new Error('Marketplace VSIX asset URL must use HTTPS');
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`VSIX download failed: HTTP ${response.status} ${response.statusText}`);
  }
  const content = Buffer.from(await response.arrayBuffer());
  if (content.length < 4 || !content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 3, 4]))) {
    throw new Error('Downloaded marketplace asset is not a VSIX ZIP (invalid magic bytes)');
  }
  const outputPath = resolve(options.outputPath || '.');
  await mkdir(outputPath, { recursive: true });
  const staging = await mkdtemp(join(outputPath, '.download-vsix-'));
  const vsixFile = join(
    outputPath,
    `${options.publisherId}.${options.extensionId}-${selected.version}.vsix`
  );
  try {
    const stagedFile = join(staging, 'download.vsix');
    await writeFile(stagedFile, content);
    await rename(stagedFile, vsixFile);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  platform.info(`Downloaded VSIX: ${vsixFile}`);
  return { vsixFile };
}
