import { cwd } from 'process';
import { FilesystemManifestReader } from './filesystem-manifest-reader.js';
import type { IPlatformAdapter } from './platform.js';
import { VsixReader } from './vsix-reader.js';

export interface ExtensionIdentityOptions {
  publisherId?: string;
  extensionId?: string;
  vsixFile?: string;
  rootFolder?: string;
  manifestGlobs?: string[];
}

export async function resolveExtensionIdentity(
  options: ExtensionIdentityOptions,
  platform: IPlatformAdapter,
  operationName: string
): Promise<{ publisherId: string; extensionId: string; version?: string }> {
  let publisherId = options.publisherId;
  let extensionId = options.extensionId;
  let version: string | undefined;

  // Whether identity was already fully known before consulting vsix/manifest sources.
  // When true, a failure to read those sources only means the (optional) version
  // fallback couldn't be resolved, and should not fail the whole operation.
  const identityAlreadyKnown = !!(publisherId && extensionId);

  if ((!publisherId || !extensionId || !version) && options.vsixFile) {
    platform.debug(`Reading extension identity from VSIX: ${options.vsixFile}`);

    try {
      const reader = await VsixReader.open(options.vsixFile);
      try {
        const metadata = await reader.getMetadata();
        publisherId = publisherId || metadata.publisher;
        extensionId = extensionId || metadata.extensionId;
        version = version || metadata.version;
      } finally {
        await reader.close();
      }
    } catch (error: unknown) {
      if (!identityAlreadyKnown) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      platform.debug(`Could not resolve extension version from VSIX: ${errorMessage}`);
    }
  }

  if (
    (!publisherId || !extensionId || !version) &&
    options.manifestGlobs !== undefined &&
    options.manifestGlobs.length > 0
  ) {
    const rootFolder = options.rootFolder ?? cwd();
    platform.debug(
      `Reading extension identity from manifest (rootFolder: ${rootFolder}, globs: ${options.manifestGlobs.join(', ')}).`
    );

    try {
      const reader = new FilesystemManifestReader({
        rootFolder,
        manifestGlobs: options.manifestGlobs,
        platform,
      });
      try {
        const metadata = await reader.getMetadata();
        publisherId = publisherId || metadata.publisher;
        extensionId = extensionId || metadata.extensionId;
        version = version || metadata.version;
      } finally {
        await reader.close();
      }
    } catch (error: unknown) {
      if (!identityAlreadyKnown) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      platform.debug(`Could not resolve extension version from manifest: ${errorMessage}`);
    }
  }

  if (!publisherId || !extensionId) {
    throw new Error(
      `publisherId and extensionId are required for ${operationName}. Provide them directly, or provide vsixFile/manifestGlobs so they can be inferred from VSIX or manifest metadata.`
    );
  }

  return { publisherId, extensionId, version };
}
