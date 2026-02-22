import { readFile } from 'fs/promises';
import type { ManifestReader } from '../manifest-reader.js';
import type { IPlatformAdapter } from '../platform.js';

export interface TaskUpdateOptionResolution {
  publisherId?: string;
  extensionId?: string;
  extensionVersion?: string;
}

interface ResolveTaskUpdateOptions {
  reader: ManifestReader;
  platform: IPlatformAdapter;
  overridesFile?: string;
  publisherId?: string;
  extensionId?: string;
  extensionVersion?: string;
}

function getDefinedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

async function readOverrides(
  overridesFile: string,
  platform: IPlatformAdapter
): Promise<TaskUpdateOptionResolution> {
  if (!(await platform.fileExists(overridesFile))) {
    return {};
  }

  let parsed: Record<string, unknown>;
  try {
    const content = (await readFile(overridesFile)).toString('utf8').trim();
    parsed = content.length > 0 ? (JSON.parse(content) as Record<string, unknown>) : {};
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const wrappedError = new Error(
      `Failed to read overrides file '${overridesFile}': ${message}`
    ) as Error & { cause?: unknown };
    wrappedError.cause = error;
    throw wrappedError;
  }

  return {
    publisherId: getDefinedString(parsed.publisher),
    extensionId: getDefinedString(parsed.id),
    extensionVersion: getDefinedString(parsed.version),
  };
}

export async function resolveTaskUpdateOptionPrecedence(
  options: ResolveTaskUpdateOptions
): Promise<TaskUpdateOptionResolution> {
  const manifest = await options.reader.readExtensionManifest();

  const resolved: TaskUpdateOptionResolution = {
    publisherId: getDefinedString(manifest.publisher),
    extensionId: getDefinedString(manifest.id),
    extensionVersion: getDefinedString(manifest.version),
  };

  if (options.overridesFile) {
    const overrides = await readOverrides(options.overridesFile, options.platform);

    if (overrides.publisherId) {
      resolved.publisherId = overrides.publisherId;
    }
    if (overrides.extensionId) {
      resolved.extensionId = overrides.extensionId;
    }
    if (overrides.extensionVersion) {
      resolved.extensionVersion = overrides.extensionVersion;
    }
  }

  const inputPublisherId = getDefinedString(options.publisherId);
  const inputExtensionId = getDefinedString(options.extensionId);
  const inputExtensionVersion = getDefinedString(options.extensionVersion);

  if (inputPublisherId) {
    resolved.publisherId = inputPublisherId;
  }
  if (inputExtensionId) {
    resolved.extensionId = inputExtensionId;
  }
  if (inputExtensionVersion) {
    resolved.extensionVersion = inputExtensionVersion;
  }

  return resolved;
}
