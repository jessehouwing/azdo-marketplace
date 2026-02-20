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
  const actionSchemaPath = path.join(rootDir, 'action.schema.yaml');
  const rootActionContent = await fs.readFile(rootActionPath, 'utf8');
  const actionSchemaContent = await fs.readFile(actionSchemaPath, 'utf8');
  const rootAction = loadYaml(rootActionContent);
  const actionSchema = loadYaml(actionSchemaContent);
  const rootInputs = rootAction.inputs ?? {};
  const rootOutputs = rootAction.outputs ?? {};
  const schemaInputs = actionSchema.inputs ?? {};
  const schemaOutputs = actionSchema.outputs ?? {};

  if (!rootInputs || typeof rootInputs !== 'object') {
    throw new Error('Root action.yml does not contain a valid inputs section');
  }

  if (!rootOutputs || typeof rootOutputs !== 'object') {
    throw new Error('Root action.yml does not contain a valid outputs section');
  }

  if (!schemaInputs || typeof schemaInputs !== 'object') {
    throw new Error('action.schema.yaml does not contain a valid inputs section');
  }

  if (!schemaOutputs || typeof schemaOutputs !== 'object') {
    throw new Error('action.schema.yaml does not contain a valid outputs section');
  }

  let updatedFiles = 0;
  let checkedFiles = 0;
  let updatedRootAction = false;
  const driftMessages = [];
  const validationErrors = [];

  for (const inputName of Object.keys(schemaInputs)) {
    if (!Object.prototype.hasOwnProperty.call(rootInputs, inputName)) {
      validationErrors.push(
        `action.schema.yaml: input '${inputName}' is not declared in action.yml`
      );
    }
  }

  for (const outputName of Object.keys(schemaOutputs)) {
    if (!Object.prototype.hasOwnProperty.call(rootOutputs, outputName)) {
      validationErrors.push(
        `action.schema.yaml: output '${outputName}' is not declared in action.yml`
      );
    }
  }

  for (const inputName of Object.keys(rootInputs)) {
    if (!Object.prototype.hasOwnProperty.call(schemaInputs, inputName)) {
      validationErrors.push(
        `action.yml: input '${inputName}' is not declared in action.schema.yaml`
      );
    }
  }

  for (const outputName of Object.keys(rootOutputs)) {
    if (!Object.prototype.hasOwnProperty.call(schemaOutputs, outputName)) {
      validationErrors.push(
        `action.yml: output '${outputName}' is not declared in action.schema.yaml`
      );
    }
  }

  const requiredByInput = new Map();
  const availableByInput = new Map();
  for (const relativeActionPath of compositeActions) {
    const absoluteActionPath = path.join(rootDir, relativeActionPath);
    const relativeSchemaPath = relativeActionPath.replace('/action.yaml', '/action.schema.yaml');
    const absoluteSchemaPath = path.join(rootDir, relativeSchemaPath);
    const compositeContent = await fs.readFile(absoluteActionPath, 'utf8');
    const compositeSchemaContent = await fs.readFile(absoluteSchemaPath, 'utf8');
    const compositeAction = loadYaml(compositeContent);
    const compositeSchema = loadYaml(compositeSchemaContent);
    const compositeInputs = compositeAction.inputs ?? {};
    const compositeOutputs = compositeAction.outputs ?? {};
    const compositeSchemaInputs = compositeSchema.inputs ?? {};
    const compositeSchemaOutputs = compositeSchema.outputs ?? {};

    if (!compositeInputs || typeof compositeInputs !== 'object') {
      continue;
    }

    if (!compositeOutputs || typeof compositeOutputs !== 'object') {
      continue;
    }

    if (!compositeSchemaInputs || typeof compositeSchemaInputs !== 'object') {
      validationErrors.push(`${relativeSchemaPath}: missing or invalid inputs section`);
      continue;
    }

    if (!compositeSchemaOutputs || typeof compositeSchemaOutputs !== 'object') {
      validationErrors.push(`${relativeSchemaPath}: missing or invalid outputs section`);
      continue;
    }

    for (const [inputName, compositeInput] of Object.entries(compositeInputs)) {
      if (!compositeInput || typeof compositeInput !== 'object') {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(rootInputs, inputName)) {
        validationErrors.push(
          `${relativeActionPath}: input '${inputName}' is not declared in action.yml`
        );
      }

      if (!Object.prototype.hasOwnProperty.call(schemaInputs, inputName)) {
        validationErrors.push(
          `${relativeActionPath}: input '${inputName}' is not declared in action.schema.yaml`
        );
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

    for (const [outputName, compositeOutput] of Object.entries(compositeOutputs)) {
      if (!compositeOutput || typeof compositeOutput !== 'object') {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(rootOutputs, outputName)) {
        validationErrors.push(
          `${relativeActionPath}: output '${outputName}' is not declared in action.yml`
        );
      }

      if (!Object.prototype.hasOwnProperty.call(schemaOutputs, outputName)) {
        validationErrors.push(
          `${relativeActionPath}: output '${outputName}' is not declared in action.schema.yaml`
        );
      }
    }

    for (const inputName of Object.keys(compositeSchemaInputs)) {
      if (!Object.prototype.hasOwnProperty.call(compositeInputs, inputName)) {
        validationErrors.push(
          `${relativeSchemaPath}: input '${inputName}' is not declared in ${relativeActionPath}`
        );
      }

      if (!Object.prototype.hasOwnProperty.call(rootInputs, inputName)) {
        validationErrors.push(
          `${relativeSchemaPath}: input '${inputName}' is not declared in action.yml`
        );
      }

      if (!Object.prototype.hasOwnProperty.call(schemaInputs, inputName)) {
        validationErrors.push(
          `${relativeSchemaPath}: input '${inputName}' is not declared in action.schema.yaml`
        );
      }
    }

    for (const outputName of Object.keys(compositeSchemaOutputs)) {
      if (!Object.prototype.hasOwnProperty.call(compositeOutputs, outputName)) {
        validationErrors.push(
          `${relativeSchemaPath}: output '${outputName}' is not declared in ${relativeActionPath}`
        );
      }

      if (!Object.prototype.hasOwnProperty.call(rootOutputs, outputName)) {
        validationErrors.push(
          `${relativeSchemaPath}: output '${outputName}' is not declared in action.yml`
        );
      }

      if (!Object.prototype.hasOwnProperty.call(schemaOutputs, outputName)) {
        validationErrors.push(
          `${relativeSchemaPath}: output '${outputName}' is not declared in action.schema.yaml`
        );
      }
    }
  }

  if (validationErrors.length > 0) {
    for (const message of validationErrors) {
      console.error(message);
    }
    throw new Error(
      `Found ${validationErrors.length} composite action input/output declaration issue(s).`
    );
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

    for (const [outputName, rootOutput] of Object.entries(rootOutputs)) {
      if (!Object.prototype.hasOwnProperty.call(compositeOutputs, outputName)) {
        continue;
      }

      const compositeOutput = compositeOutputs[outputName];
      if (!compositeOutput || typeof compositeOutput !== 'object') {
        continue;
      }

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
