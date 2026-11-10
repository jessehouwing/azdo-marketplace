import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ManifestEditor } from '../manifest-editor.js';
import type { IPlatformAdapter } from '../platform.js';
import { validateExtensionId, validatePublisherId, validateVersion } from '../validation.js';
import { VsixReader } from '../vsix-reader.js';
import { VsixWriter } from '../vsix-writer.js';
import type { PublishOptions } from './publish.js';

/** Manifest edits to apply to an existing VSIX without publishing it. */
export type PatchOptions = Pick<
  PublishOptions,
  | 'publisherId'
  | 'extensionId'
  | 'extensionVersion'
  | 'extensionName'
  | 'extensionVisibility'
  | 'extensionPricing'
  | 'updateTasksVersion'
  | 'updateTasksId'
  | 'outputPath'
> & { vsixFile: string };

/** Patch a VSIX, leaving the source untouched until the output is complete. */
export async function patchExtension(
  options: PatchOptions,
  platform: IPlatformAdapter
): Promise<{ vsixFile: string }> {
  const reader = await VsixReader.open(options.vsixFile);
  try {
    const metadata = await reader.getMetadata();
    const publisher = options.publisherId || metadata.publisher;
    const extensionId = options.extensionId || metadata.extensionId;
    const version = options.extensionVersion || metadata.version;
    validatePublisherId(publisher);
    validateExtensionId(extensionId);
    validateVersion(version);

    const editor = ManifestEditor.fromReader(reader);
    await editor.applyOptions(options);
    const outputPath = resolve(options.outputPath || '.');
    await mkdir(outputPath, { recursive: true });
    const staging = await mkdtemp(join(outputPath, '.patch-'));
    const vsixFile = join(outputPath, `${publisher}.${extensionId}-${version}.vsix`);
    const writer = VsixWriter.fromEditor(editor);
    try {
      const stagedFile = join(staging, 'patched.vsix');
      await writer.writeToFile(stagedFile);
      // Close the input before replacing it (required on Windows).
      await reader.close();
      await rename(stagedFile, vsixFile);
    } finally {
      await writer.close();
      await rm(staging, { recursive: true, force: true });
    }
    platform.info(`Patched VSIX: ${vsixFile}`);
    return { vsixFile };
  } finally {
    await reader.close();
  }
}
