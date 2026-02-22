import { afterEach, describe, expect, it } from '@jest/globals';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveTaskUpdateOptionPrecedence } from '../commands/manifest-option-precedence.js';
import { ManifestReader } from '../manifest-reader.js';
import type { ExtensionManifest, TaskManifest } from '../manifest-reader.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

class TestManifestReader extends ManifestReader {
  constructor(private readonly extensionManifest: ExtensionManifest) {
    super();
  }

  async readExtensionManifest(): Promise<ExtensionManifest> {
    return this.extensionManifest;
  }

  async readTaskManifest(_taskPath: string): Promise<TaskManifest> {
    throw new Error('Not implemented for this test');
  }

  async findTaskPaths(): Promise<string[]> {
    return [];
  }

  async close(): Promise<void> {
    // no-op for test reader
  }
}

describe('resolveTaskUpdateOptionPrecedence', () => {
  const createdDirs: string[] = [];

  const createOverridesFile = async (content: Record<string, unknown>): Promise<string> => {
    const root = await fs.mkdtemp(join(tmpdir(), 'precedence-overrides-'));
    createdDirs.push(root);

    const overridesPath = join(root, 'overrides.json');
    await fs.writeFile(overridesPath, JSON.stringify(content, null, 2), 'utf8');
    return overridesPath;
  };

  afterEach(async () => {
    for (const dir of createdDirs.splice(0)) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  const manifest = {
    id: 'manifest-ext',
    publisher: 'manifest-publisher',
    version: '1.0.0',
    files: [],
  } satisfies ExtensionManifest;

  it.each([
    {
      name: 'manifest defaults when only manifest values exist',
      overrides: undefined,
      inputs: {},
      expected: {
        publisherId: 'manifest-publisher',
        extensionId: 'manifest-ext',
        extensionVersion: '1.0.0',
      },
    },
    {
      name: 'overrides file values over manifest',
      overrides: {
        publisher: 'overrides-publisher',
        id: 'overrides-ext',
        version: '2.3.4',
      },
      inputs: {},
      expected: {
        publisherId: 'overrides-publisher',
        extensionId: 'overrides-ext',
        extensionVersion: '2.3.4',
      },
    },
    {
      name: 'inputs over overrides and manifest',
      overrides: {
        publisher: 'overrides-publisher',
        id: 'overrides-ext',
        version: '2.3.4',
      },
      inputs: {
        publisherId: 'input-publisher',
        extensionId: 'input-ext',
        extensionVersion: '9.8.7',
      },
      expected: {
        publisherId: 'input-publisher',
        extensionId: 'input-ext',
        extensionVersion: '9.8.7',
      },
    },
    {
      name: 'partial override id keeps manifest publisher and version',
      overrides: {
        id: 'overrides-ext',
      },
      inputs: {},
      expected: {
        publisherId: 'manifest-publisher',
        extensionId: 'overrides-ext',
        extensionVersion: '1.0.0',
      },
    },
    {
      name: 'partial override publisher keeps manifest id and version',
      overrides: {
        publisher: 'overrides-publisher',
      },
      inputs: {},
      expected: {
        publisherId: 'overrides-publisher',
        extensionId: 'manifest-ext',
        extensionVersion: '1.0.0',
      },
    },
    {
      name: 'input publisher overrides while id remains from overrides',
      overrides: {
        id: 'overrides-ext',
      },
      inputs: {
        publisherId: 'input-publisher',
      },
      expected: {
        publisherId: 'input-publisher',
        extensionId: 'overrides-ext',
        extensionVersion: '1.0.0',
      },
    },
    {
      name: 'blank override values do not reset manifest values',
      overrides: {
        publisher: '   ',
        id: '',
        version: '  ',
      },
      inputs: {},
      expected: {
        publisherId: 'manifest-publisher',
        extensionId: 'manifest-ext',
        extensionVersion: '1.0.0',
      },
    },
    {
      name: 'blank inputs do not reset lower-precedence values',
      overrides: {
        publisher: 'overrides-publisher',
        id: 'overrides-ext',
        version: '2.3.4',
      },
      inputs: {
        publisherId: '  ',
        extensionId: '',
        extensionVersion: ' ',
      },
      expected: {
        publisherId: 'overrides-publisher',
        extensionId: 'overrides-ext',
        extensionVersion: '2.3.4',
      },
    },
  ])('$name', async ({ overrides, inputs, expected }) => {
    const platform = new MockPlatformAdapter();
    const reader = new TestManifestReader(manifest);

    const overridesFile = overrides ? await createOverridesFile(overrides) : undefined;

    const result = await resolveTaskUpdateOptionPrecedence({
      reader,
      platform,
      overridesFile,
      ...inputs,
    });

    expect(result).toEqual(expected);
  });
});
