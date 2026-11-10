import { describe, expect, it } from '@jest/globals';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

type TaskInput = {
  name?: string;
  visibleRule?: string;
  defaultValue?: string;
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

describe('new operation input visibility', () => {
  it.each([
    {
      operation: 'patch',
      visible: [
        'vsixFile',
        'outputPath',
        'publisherId',
        'extensionId',
        'extensionVersion',
        'extensionName',
        'extensionVisibility',
        'extensionPricing',
        'updateTasksVersion',
        'updateTasksId',
      ],
      hidden: ['use', 'connectionType', 'connectionNamePAT', 'version', 'tfxVersion'],
    },
    {
      operation: 'downloadVsix',
      visible: [
        'publisherId',
        'extensionId',
        'version',
        'outputPath',
        'connectionType',
        'connectionNamePAT',
        'tfxVersion',
      ],
      hidden: ['use', 'vsixFile', 'extensionVersion', 'updateTasksId'],
    },
  ])('exposes usable inputs for $operation', async ({ operation, visible, hidden }) => {
    const manifest = JSON.parse(await readFile(taskManifestPaths[0], 'utf-8')) as TaskManifest;
    const inputs = new Map((manifest.inputs ?? []).map((input) => [input.name, input]));
    const values: Record<string, string> = { operation, connectionType: 'PAT', use: 'manifest' };

    function isVisible(name: string): boolean {
      const input = inputs.get(name);
      if (!input) {
        throw new Error(`Unknown input ${name}`);
      }
      if (!input.visibleRule) {
        return true;
      }

      const clauses = input.visibleRule.split(/\s*(\|\||&&)\s*/);
      const conditions = clauses.filter((clause) => clause !== '||' && clause !== '&&');
      const matches = conditions.map((clause) => {
        const match = /^(\w+)\s*(!=|=)\s*(\S+)$/.exec(clause);
        if (!match) {
          throw new Error(`Unsupported visibleRule clause: ${clause}`);
        }
        return match;
      });
      if (matches.some(([, dependency]) => !isVisible(dependency))) {
        return false;
      }
      const evaluate = ([, dependency, operator, expected]: RegExpExecArray): boolean => {
        const actual = values[dependency] ?? inputs.get(dependency)?.defaultValue ?? '';
        return operator === '=' ? actual === expected : actual !== expected;
      };
      return clauses.includes('||') ? matches.some(evaluate) : matches.every(evaluate);
    }

    for (const name of visible) {
      expect({ name, visible: isVisible(name) }).toEqual({ name, visible: true });
    }
    for (const name of hidden) {
      expect({ name, visible: isVisible(name) }).toEqual({ name, visible: false });
    }
  });
});
