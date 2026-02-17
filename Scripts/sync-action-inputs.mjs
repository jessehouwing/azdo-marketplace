#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const compositeActions = [
  'install/action.yaml',
  'package/action.yaml',
  'publish/action.yaml',
  'query-version/action.yaml',
  'share/action.yaml',
  'show/action.yaml',
  'unpublish/action.yaml',
  'unshare/action.yaml',
  'wait-for-installation/action.yaml',
  'wait-for-validation/action.yaml',
];

const checkOnly = process.argv.includes('--check');
const preservedRootOnlyInputs = new Set(['operation']);

function loadYaml(content) {
  const parsed = yaml.load(content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid YAML document');
  }
  return parsed;
}

function syncInputFromRoot(compositeInput, rootInput) {
  let changed = false;

  if (Object.prototype.hasOwnProperty.call(rootInput, 'description')) {
    if (compositeInput.description !== rootInput.description) {
      compositeInput.description = rootInput.description;
      changed = true;
    }
  }

  if (Object.prototype.hasOwnProperty.call(rootInput, 'default')) {
    if (compositeInput.default !== rootInput.default) {
      compositeInput.default = rootInput.default;
      changed = true;
    }
  } else if (Object.prototype.hasOwnProperty.call(compositeInput, 'default')) {
    delete compositeInput.default;
    changed = true;
  }

  return changed;
}

function syncOutputFromRoot(compositeOutput, rootOutput) {
  let changed = false;

  if (Object.prototype.hasOwnProperty.call(rootOutput, 'description')) {
    if (compositeOutput.description !== rootOutput.description) {
      compositeOutput.description = rootOutput.description;
      changed = true;
    }
  }

  return changed;
}

function normalizeOperationList(items) {
  return [...items].sort((left, right) => left.localeCompare(right));
}

function stripManagedMetadataLines(content) {
  const lines = content.split('\n');
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (/^available\s+for:/i.test(trimmed)) {
      return false;
    }
    if (/^required\s+for\s*(command)?\s*:/i.test(trimmed)) {
      return false;
    }
    if (/^default\s*:/i.test(trimmed)) {
      return false;
    }
    return true;
  });

  while (filtered.length > 0 && filtered[0].trim().length === 0) {
    filtered.shift();
  }

  return filtered
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function buildCanonicalInputDescription({
  existingDescription,
  availableFor,
  requiredFor,
  defaultValue,
}) {
  const description =
    typeof existingDescription === 'string' ? existingDescription.replace(/\r\n/g, '\n') : '';
  const lines = description.split('\n');
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);

  const shortLine =
    firstContentIndex === -1 ? '**Input description**' : lines[firstContentIndex].trimEnd();
  const remainder = firstContentIndex === -1 ? '' : lines.slice(firstContentIndex + 1).join('\n');
  const cleanedRemainder = stripManagedMetadataLines(remainder);

  const rendered = [
    shortLine,
    '',
    `Available for: ${availableFor.size > 0 ? normalizeOperationList(availableFor).join(', ') : 'none'}.`,
    `Required for: ${requiredFor.size > 0 ? normalizeOperationList(requiredFor).join(', ') : 'none'}.`,
    `Default: ${defaultValue === undefined ? 'none' : String(defaultValue)}`,
  ];

  if (cleanedRemainder.length > 0) {
    rendered.push('', cleanedRemainder);
  }

  return rendered
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function main() {
  const rootActionPath = path.join(rootDir, 'action.yml');
  const rootActionContent = await fs.readFile(rootActionPath, 'utf8');
  const rootAction = loadYaml(rootActionContent);
  const rootInputs = rootAction.inputs ?? {};
  const rootOutputs = rootAction.outputs ?? {};

  if (!rootInputs || typeof rootInputs !== 'object') {
    throw new Error('Root action.yml does not contain a valid inputs section');
  }

  let updatedFiles = 0;
  let checkedFiles = 0;
  let updatedRootAction = false;
  const driftMessages = [];

  const requiredByInput = new Map();
  const availableByInput = new Map();
  for (const relativeActionPath of compositeActions) {
    const absoluteActionPath = path.join(rootDir, relativeActionPath);
    const compositeContent = await fs.readFile(absoluteActionPath, 'utf8');
    const compositeAction = loadYaml(compositeContent);
    const compositeInputs = compositeAction.inputs ?? {};

    if (!compositeInputs || typeof compositeInputs !== 'object') {
      continue;
    }

    for (const [inputName, compositeInput] of Object.entries(compositeInputs)) {
      if (!compositeInput || typeof compositeInput !== 'object') {
        continue;
      }

      const inputAvailableFor = availableByInput.get(inputName) ?? new Set();
      inputAvailableFor.add(relativeActionPath.replace('/action.yaml', ''));
      availableByInput.set(inputName, inputAvailableFor);

      if (compositeInput.required === true) {
        const inputRequiredFor = requiredByInput.get(inputName) ?? new Set();
        inputRequiredFor.add(relativeActionPath.replace('/action.yaml', ''));
        requiredByInput.set(inputName, inputRequiredFor);
      }
    }
  }

  for (const [inputName, rootInput] of Object.entries(rootInputs)) {
    if (!rootInput || typeof rootInput !== 'object') {
      continue;
    }

    const availableForCommands =
      inputName === 'operation'
        ? new Set(compositeActions.map((relativePath) => relativePath.replace('/action.yaml', '')))
        : (availableByInput.get(inputName) ?? new Set());
    const requiredForCommands =
      inputName === 'operation'
        ? new Set(compositeActions.map((relativePath) => relativePath.replace('/action.yaml', '')))
        : (requiredByInput.get(inputName) ?? new Set());

    if (availableForCommands.size === 0 && !preservedRootOnlyInputs.has(inputName)) {
      delete rootInputs[inputName];
      updatedRootAction = true;
      driftMessages.push(`action.yml: removed orphan input '${inputName}'`);
      continue;
    }

    const canonicalDescription = buildCanonicalInputDescription({
      existingDescription: rootInput.description,
      availableFor: availableForCommands,
      requiredFor: requiredForCommands,
      defaultValue: rootInput.default,
    });

    if (rootInput.description !== canonicalDescription) {
      rootInput.description = canonicalDescription;
      updatedRootAction = true;
      driftMessages.push(`action.yml: rendered canonical description for '${inputName}'`);
    }
  }

  for (const relativeActionPath of compositeActions) {
    const absoluteActionPath = path.join(rootDir, relativeActionPath);
    const compositeContent = await fs.readFile(absoluteActionPath, 'utf8');
    const compositeAction = loadYaml(compositeContent);
    const compositeInputs = compositeAction.inputs ?? {};
    const compositeOutputs = compositeAction.outputs ?? {};

    if (!compositeInputs || typeof compositeInputs !== 'object') {
      continue;
    }

    checkedFiles++;
    let changed = false;

    for (const [inputName, compositeInput] of Object.entries(compositeInputs)) {
      if (!Object.prototype.hasOwnProperty.call(rootInputs, inputName)) {
        continue;
      }

      if (!compositeInput || typeof compositeInput !== 'object') {
        continue;
      }

      const rootInput = rootInputs[inputName];
      if (!rootInput || typeof rootInput !== 'object') {
        continue;
      }

      if (syncInputFromRoot(compositeInput, rootInput)) {
        changed = true;
        driftMessages.push(`${relativeActionPath}: synchronized '${inputName}'`);
      }
    }

    for (const [outputName, compositeOutput] of Object.entries(compositeOutputs)) {
      if (!Object.prototype.hasOwnProperty.call(rootOutputs, outputName)) {
        continue;
      }

      if (!compositeOutput || typeof compositeOutput !== 'object') {
        continue;
      }

      const rootOutput = rootOutputs[outputName];
      if (!rootOutput || typeof rootOutput !== 'object') {
        continue;
      }

      if (syncOutputFromRoot(compositeOutput, rootOutput)) {
        changed = true;
        driftMessages.push(`${relativeActionPath}: synchronized output '${outputName}'`);
      }
    }

    if (changed) {
      if (checkOnly) {
        continue;
      }

      const rendered =
        yaml.dump(compositeAction, {
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        }) + '\n';

      await fs.writeFile(absoluteActionPath, rendered, 'utf8');
      updatedFiles++;
    }
  }

  if (updatedRootAction && !checkOnly) {
    const renderedRootAction =
      yaml.dump(rootAction, {
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      }) + '\n';

    await fs.writeFile(rootActionPath, renderedRootAction, 'utf8');
  }

  if (driftMessages.length > 0) {
    for (const message of driftMessages) {
      console.log(message);
    }
  }

  if (checkOnly) {
    if (driftMessages.length > 0) {
      console.error(`Found action metadata drift in ${driftMessages.length} place(s).`);
      process.exit(1);
    }
    console.log(`No action metadata drift found across ${checkedFiles} composite action file(s).`);
    return;
  }

  if (updatedFiles > 0) {
    console.log(`Updated ${updatedFiles} composite action file(s).`);
  } else {
    console.log(`No changes needed across ${checkedFiles} composite action file(s).`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
