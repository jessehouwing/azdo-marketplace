import { describe, expect, it } from '@jest/globals';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

type TaskInput = {
  name?: string;
  visibleRule?: string;
};

type TaskManifest = {
  inputs?: TaskInput[];
};

const taskManifestPaths = [
  resolve(process.cwd(), 'packages/azdo-task/task.json'),
  resolve(process.cwd(), 'packages/azdo-server-task/task.json'),
] as const;

describe('task.json visibleRule syntax', () => {
  it.each(taskManifestPaths)(
    'validates visibleRule expressions in %s',
    async (taskManifestPath) => {
      const content = await readFile(taskManifestPath, 'utf-8');
      const taskManifest = JSON.parse(content) as TaskManifest;

      const violations: string[] = [];

      for (const input of taskManifest.inputs ?? []) {
        const visibleRule = input.visibleRule;
        if (!visibleRule) {
          continue;
        }

        const hasAnd = visibleRule.includes('&&');
        const hasOr = visibleRule.includes('||');
        const hasParentheses = /[()]/.test(visibleRule);
        const inputName = input.name ?? '<unknown>';

        if (hasAnd && hasOr) {
          violations.push(`${inputName}: mixes '&&' and '||' in visibleRule '${visibleRule}'`);
        }

        if (hasParentheses) {
          violations.push(`${inputName}: uses parentheses in visibleRule '${visibleRule}'`);
        }
      }

      expect(violations).toEqual([]);
    }
  );
});
