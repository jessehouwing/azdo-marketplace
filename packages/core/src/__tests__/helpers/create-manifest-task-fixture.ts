import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

interface TaskVersion {
  Major: number;
  Minor: number;
  Patch: number;
}

export interface CreateManifestTaskFixtureOptions {
  prefix?: string;
  createTask?: boolean;
  extensionId?: string;
  publisher?: string;
  extensionVersion?: string;
  taskFolder?: string;
  taskName?: string;
  taskId?: string;
  taskVersion?: TaskVersion;
}

export interface ManifestTaskFixture {
  root: string;
  taskDir: string;
  manifestPath: string;
  taskJsonPath: string;
  cleanup: () => Promise<void>;
}

export async function createManifestTaskFixture(
  options: CreateManifestTaskFixtureOptions = {}
): Promise<ManifestTaskFixture> {
  const root = await fs.mkdtemp(join(tmpdir(), options.prefix ?? 'manifest-task-fixture-'));
  const createTask = options.createTask ?? true;
  const taskFolder = options.taskFolder ?? 'task1';
  const taskName = options.taskName ?? taskFolder;
  const taskDir = join(root, taskFolder);
  const manifestPath = join(root, 'vss-extension.json');
  const taskJsonPath = join(taskDir, 'task.json');

  if (createTask) {
    await fs.mkdir(taskDir, { recursive: true });
  }

  await fs.writeFile(
    manifestPath,
    JSON.stringify({
      id: options.extensionId ?? 'ext',
      publisher: options.publisher ?? 'pub',
      version: options.extensionVersion ?? '1.0.0',
      files: createTask ? [{ path: taskFolder }] : [],
      contributions: createTask
        ? [
            {
              id: taskName,
              type: 'ms.vss-distributed-task.task',
              properties: { name: taskName },
            },
          ]
        : [],
    }),
    'utf-8'
  );

  if (createTask) {
    await fs.writeFile(
      taskJsonPath,
      JSON.stringify({
        id: options.taskId ?? '11111111-1111-1111-1111-111111111111',
        name: taskName,
        friendlyName: 'Task 1',
        description: 'desc',
        version: options.taskVersion ?? { Major: 1, Minor: 0, Patch: 0 },
        instanceNameFormat: 'Task 1',
      }),
      'utf-8'
    );
  }

  return {
    root,
    taskDir,
    manifestPath,
    taskJsonPath,
    cleanup: async () => fs.rm(root, { recursive: true, force: true }),
  };
}
