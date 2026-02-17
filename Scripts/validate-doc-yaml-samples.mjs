#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const IGNORE_MARKERS = ['# docs-validforate-ignore', '# docs-validate-ignore'];
const ACTION_REPO = 'jessehouwing/azdo-marketplace';
const AZDO_TASK_SCHEMA_FILES = [
  'packages/azdo-task/task.json',
  'packages/azdo-server-task/task.json',
];

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function normalizeEol(value) {
  return value.replace(/\r\n/g, '\n');
}

function lineAtOffset(value, offset) {
  let line = 1;
  for (let index = 0; index < offset && index < value.length; index++) {
    if (value[index] === '\n') {
      line++;
    }
  }
  return line;
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function listMarkdownFiles(directory) {
  const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage']);
  const result = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        const nested = await listMarkdownFiles(fullPath);
        result.push(...nested);
      }
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      result.push(fullPath);
    }
  }

  return result;
}

function extractYamlCodeBlocks(markdownContent) {
  const blocks = [];
  const normalized = normalizeEol(markdownContent);
  const regex = /```(?:yaml|yml)\s*\n([\s\S]*?)```/gi;
  let match;

  while ((match = regex.exec(normalized)) !== null) {
    const blockText = match[1];
    const fenceLine = lineAtOffset(normalized, match.index);
    const contentStartLine = fenceLine + 1;
    blocks.push({
      text: blockText,
      contentStartLine,
    });
  }

  return blocks;
}

function extractActionReference(usesValue) {
  if (typeof usesValue !== 'string') {
    return undefined;
  }

  const trimmed = unquote(usesValue);
  const pattern = new RegExp(`^${ACTION_REPO}(?:/([A-Za-z0-9._-]+))?@.+$`, 'i');
  const match = trimmed.match(pattern);
  if (!match) {
    return undefined;
  }

  return {
    actionName: match[1] ?? '',
    uses: trimmed,
  };
}

function extractAzdoTaskReference(taskValue) {
  if (typeof taskValue !== 'string') {
    return undefined;
  }

  const trimmed = unquote(taskValue);
  const match = trimmed.match(/^([^@\s]+)@([^\s]+)$/);
  if (!match) {
    return undefined;
  }

  return {
    taskName: match[1],
    task: trimmed,
  };
}

function findReferencedSteps(node, found = []) {
  if (Array.isArray(node)) {
    for (const item of node) {
      findReferencedSteps(item, found);
    }
    return found;
  }

  if (!isObject(node)) {
    return found;
  }

  const actionRef = extractActionReference(node.uses);
  if (actionRef) {
    found.push({
      ...actionRef,
      id: typeof node.id === 'string' ? node.id : undefined,
      with: isObject(node.with) ? node.with : undefined,
    });
  }

  for (const value of Object.values(node)) {
    findReferencedSteps(value, found);
  }

  return found;
}

function findReferencedTasks(node, found = []) {
  if (Array.isArray(node)) {
    for (const item of node) {
      findReferencedTasks(item, found);
    }
    return found;
  }

  if (!isObject(node)) {
    return found;
  }

  const taskRef = extractAzdoTaskReference(node.task);
  if (taskRef) {
    found.push({
      ...taskRef,
      name: typeof node.name === 'string' ? node.name : undefined,
      inputs: isObject(node.inputs) ? node.inputs : undefined,
    });
  }

  for (const value of Object.values(node)) {
    findReferencedTasks(value, found);
  }

  return found;
}

function countIndent(line) {
  const match = line.match(/^[ \t]*/);
  return match ? match[0].length : 0;
}

function findReferencedStepsTolerant(blockText) {
  const lines = blockText.split('\n');
  const found = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const usesMatch = line.match(/^([ \t]*)-\s+uses:\s*(.+?)\s*$/);
    if (!usesMatch) {
      continue;
    }

    const usesValue = unquote(usesMatch[2]);
    const actionRef = extractActionReference(usesValue);
    if (!actionRef) {
      continue;
    }

    const stepIndent = usesMatch[1].length;
    let id;
    let withObject;
    const withLines = new Map();

    let withIndent = -1;
    for (let innerIndex = lineIndex + 1; innerIndex < lines.length; innerIndex++) {
      const innerLine = lines[innerIndex];
      if (innerLine.trim().length === 0) {
        continue;
      }

      const innerIndent = countIndent(innerLine);
      const nextStepMatch = innerLine.match(/^([ \t]*)-\s+/);
      if (nextStepMatch && nextStepMatch[1].length <= stepIndent) {
        break;
      }

      if (innerIndent <= stepIndent) {
        break;
      }

      const idMatch = innerLine.match(/^[ \t]*id:\s*([^#\n]+?)\s*$/);
      if (idMatch) {
        id = unquote(idMatch[1]);
      }

      const withMatch = innerLine.match(/^([ \t]*)with:\s*$/);
      if (withMatch) {
        withIndent = withMatch[1].length;
        if (!withObject) {
          withObject = {};
        }
        continue;
      }

      if (withIndent >= 0 && innerIndent > withIndent) {
        const keyMatch = innerLine.match(/^[ \t]*([A-Za-z0-9_.-]+)\s*:/);
        if (keyMatch) {
          const key = keyMatch[1];
          withObject ??= {};
          withObject[key] = true;
          withLines.set(key, innerIndex + 1);
        }
      }
    }

    found.push({
      ...actionRef,
      id,
      with: withObject,
      withLines,
      lineInBlock: lineIndex + 1,
    });
  }

  return found;
}

function findReferencedTasksTolerant(blockText) {
  const lines = blockText.split('\n');
  const found = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const taskMatch = line.match(/^([ \t]*)-\s+task:\s*(.+?)\s*$/);
    if (!taskMatch) {
      continue;
    }

    const taskValue = unquote(taskMatch[2]);
    const taskRef = extractAzdoTaskReference(taskValue);
    if (!taskRef) {
      continue;
    }

    const stepIndent = taskMatch[1].length;
    let stepName;
    let inputs;
    const inputLines = new Map();
    let inputsIndent = -1;

    for (let innerIndex = lineIndex + 1; innerIndex < lines.length; innerIndex++) {
      const innerLine = lines[innerIndex];
      if (innerLine.trim().length === 0) {
        continue;
      }

      const innerIndent = countIndent(innerLine);
      const nextStepMatch = innerLine.match(/^([ \t]*)-\s+/);
      if (nextStepMatch && nextStepMatch[1].length <= stepIndent) {
        break;
      }

      if (innerIndent <= stepIndent) {
        break;
      }

      const nameMatch = innerLine.match(/^[ \t]*name:\s*([^#\n]+?)\s*$/);
      if (nameMatch) {
        stepName = unquote(nameMatch[1]);
      }

      const inputsMatch = innerLine.match(/^([ \t]*)inputs:\s*$/);
      if (inputsMatch) {
        inputsIndent = inputsMatch[1].length;
        inputs ??= {};
        continue;
      }

      if (inputsIndent >= 0 && innerIndent > inputsIndent) {
        const keyMatch = innerLine.match(/^[ \t]*([A-Za-z0-9_.-]+)\s*:/);
        if (keyMatch) {
          const key = keyMatch[1];
          inputs ??= {};
          inputs[key] = true;
          inputLines.set(key, innerIndex + 1);
        }
      }
    }

    found.push({
      ...taskRef,
      name: stepName,
      inputs,
      inputLines,
      lineInBlock: lineIndex + 1,
    });
  }

  return found;
}

function locateInBlock(blockText, pattern, fallbackLine) {
  const index = blockText.search(pattern);
  if (index < 0) {
    return fallbackLine;
  }
  return lineAtOffset(blockText, index);
}

async function loadActionSchemas() {
  const schemas = new Map();
  const rootActionPath = path.join(rootDir, 'action.yml');
  const rootActionContent = normalizeEol(await fs.readFile(rootActionPath, 'utf8'));
  const rootAction = yaml.load(rootActionContent);

  if (!isObject(rootAction)) {
    throw new Error('Invalid root action.yml');
  }

  schemas.set('', {
    inputs: new Set(Object.keys(isObject(rootAction.inputs) ? rootAction.inputs : {})),
    outputs: new Set(Object.keys(isObject(rootAction.outputs) ? rootAction.outputs : {})),
    sourceFile: 'action.yml',
  });

  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const actionFile = path.join(rootDir, entry.name, 'action.yaml');
    try {
      const actionContent = normalizeEol(await fs.readFile(actionFile, 'utf8'));
      const action = yaml.load(actionContent);
      if (!isObject(action)) {
        continue;
      }

      schemas.set(entry.name, {
        inputs: new Set(Object.keys(isObject(action.inputs) ? action.inputs : {})),
        outputs: new Set(Object.keys(isObject(action.outputs) ? action.outputs : {})),
        sourceFile: `${entry.name}/action.yaml`,
      });
    } catch {
      // Ignore folders without action.yaml
    }
  }

  return schemas;
}

async function loadAzdoTaskSchemas() {
  const schemas = new Map();

  for (const relativeSchemaPath of AZDO_TASK_SCHEMA_FILES) {
    const absoluteSchemaPath = path.join(rootDir, relativeSchemaPath);
    const jsonContent = normalizeEol(await fs.readFile(absoluteSchemaPath, 'utf8'));
    const parsed = JSON.parse(jsonContent);
    if (!isObject(parsed) || typeof parsed.name !== 'string') {
      continue;
    }

    const inputs = Array.isArray(parsed.inputs)
      ? new Set(
          parsed.inputs
            .filter((item) => isObject(item) && typeof item.name === 'string')
            .map((item) => item.name)
        )
      : new Set();

    const outputs = Array.isArray(parsed.outputVariables)
      ? new Set(
          parsed.outputVariables
            .filter((item) => isObject(item) && typeof item.name === 'string')
            .map((item) => item.name)
        )
      : new Set();

    schemas.set(parsed.name, {
      inputs,
      outputs,
      sourceFile: toPosixPath(relativeSchemaPath),
    });
  }

  return schemas;
}

function collectOutputReferences(blockText) {
  const references = [];
  const regex = /steps\.([A-Za-z0-9_-]+)\.outputs\.([A-Za-z0-9_-]+)/g;
  let match;

  while ((match = regex.exec(blockText)) !== null) {
    references.push({
      stepId: match[1],
      outputName: match[2],
      lineInBlock: lineAtOffset(blockText, match.index),
    });
  }

  return references;
}

function collectAzureOutputReferences(blockText) {
  const references = [];
  const regex = /\$\(\s*([A-Za-z_][A-Za-z0-9_-]*)\.([A-Za-z0-9_.-]+)\s*\)/g;
  let match;

  while ((match = regex.exec(blockText)) !== null) {
    references.push({
      stepName: match[1],
      outputName: match[2],
      lineInBlock: lineAtOffset(blockText, match.index),
    });
  }

  return references;
}

function dedentBlock(blockText) {
  const lines = blockText.split('\n');
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  if (nonEmptyLines.length === 0) {
    return blockText;
  }

  let minIndent = Infinity;
  for (const line of nonEmptyLines) {
    const match = line.match(/^[ \t]*/);
    const indent = match ? match[0].length : 0;
    if (indent < minIndent) {
      minIndent = indent;
    }
  }

  if (!Number.isFinite(minIndent) || minIndent <= 0) {
    return blockText;
  }

  return lines
    .map((line) => {
      if (line.trim().length === 0) {
        return line;
      }

      let remaining = minIndent;
      let index = 0;
      while (
        remaining > 0 &&
        index < line.length &&
        (line[index] === ' ' || line[index] === '\t')
      ) {
        index++;
        remaining--;
      }
      return line.slice(index);
    })
    .join('\n');
}

function normalizeYamlForParsing(blockText) {
  return dedentBlock(blockText).replace(/\t/g, '  ');
}

function createError(relativeFilePath, line, message) {
  return `${relativeFilePath}:${line} ${message}`;
}

async function main() {
  const schemas = await loadActionSchemas();
  const azdoTaskSchemas = await loadAzdoTaskSchemas();
  const markdownFiles = await listMarkdownFiles(rootDir);
  const errors = [];

  let scannedBlocks = 0;
  let validatedGitHubSteps = 0;
  let validatedAzdoTasks = 0;

  for (const markdownFile of markdownFiles) {
    const content = normalizeEol(await fs.readFile(markdownFile, 'utf8'));
    const blocks = extractYamlCodeBlocks(content);
    const relativeFilePath = toPosixPath(path.relative(rootDir, markdownFile));

    for (const [blockIndex, block] of blocks.entries()) {
      if (IGNORE_MARKERS.some((marker) => block.text.includes(marker))) {
        continue;
      }

      scannedBlocks++;

      let parsed;
      const normalizedBlockText = normalizeYamlForParsing(block.text);
      let usedTolerantMode = false;
      let steps = [];
      let taskSteps = [];

      try {
        parsed = yaml.load(normalizedBlockText);
        steps = findReferencedSteps(parsed);
        taskSteps = findReferencedTasks(parsed);
      } catch (error) {
        usedTolerantMode = true;
        steps = findReferencedStepsTolerant(normalizedBlockText);
        taskSteps = findReferencedTasksTolerant(normalizedBlockText);

        const hasPotentialAzdoTask =
          normalizedBlockText.includes('- task:') || normalizedBlockText.includes('task:');
        if (
          steps.length === 0 &&
          taskSteps.length === 0 &&
          (normalizedBlockText.includes(ACTION_REPO) || hasPotentialAzdoTask)
        ) {
          const line = block.contentStartLine;
          const message =
            error instanceof Error ? error.message.split('\n')[0] : 'Invalid YAML block';
          errors.push(
            createError(
              relativeFilePath,
              line,
              `[block ${blockIndex + 1}] YAML parse error: ${message}`
            )
          );
          continue;
        }
      }

      if (steps.length === 0 && taskSteps.length === 0) {
        continue;
      }

      const knownStepOutputs = new Map();
      const knownAzdoStepOutputs = new Map();

      for (const step of steps) {
        const schema = schemas.get(step.actionName);
        const usesPattern = new RegExp(
          `uses:\\s*${step.uses.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`
        );
        const stepLine =
          typeof step.lineInBlock === 'number'
            ? block.contentStartLine + step.lineInBlock - 1
            : block.contentStartLine + locateInBlock(normalizedBlockText, usesPattern, 1) - 1;

        if (!schema) {
          errors.push(
            createError(
              relativeFilePath,
              stepLine,
              `[block ${blockIndex + 1}] Unknown action reference '${step.uses}'`
            )
          );
          continue;
        }

        validatedGitHubSteps++;

        if (step.with && isObject(step.with)) {
          for (const inputName of Object.keys(step.with)) {
            if (!schema.inputs.has(inputName)) {
              let lineInBlock;
              if (
                usedTolerantMode &&
                step.withLines instanceof Map &&
                step.withLines.has(inputName)
              ) {
                lineInBlock = step.withLines.get(inputName);
              } else {
                const inputPattern = new RegExp(`\\n\\s*${inputName}:`);
                lineInBlock = locateInBlock(normalizedBlockText, inputPattern, 1);
              }
              errors.push(
                createError(
                  relativeFilePath,
                  block.contentStartLine + lineInBlock - 1,
                  `[block ${blockIndex + 1}] Unknown input '${inputName}' for '${step.uses}' (schema: ${schema.sourceFile})`
                )
              );
            }
          }
        }

        if (step.id) {
          knownStepOutputs.set(step.id, schema.outputs);
        }
      }

      for (const taskStep of taskSteps) {
        const taskSchema = azdoTaskSchemas.get(taskStep.taskName);
        const taskPattern = new RegExp(
          `task:\\s*${taskStep.task.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`
        );
        const taskLine =
          typeof taskStep.lineInBlock === 'number'
            ? block.contentStartLine + taskStep.lineInBlock - 1
            : block.contentStartLine + locateInBlock(normalizedBlockText, taskPattern, 1) - 1;

        if (!taskSchema) {
          continue;
        }

        validatedAzdoTasks++;

        if (taskStep.inputs && isObject(taskStep.inputs)) {
          for (const inputName of Object.keys(taskStep.inputs)) {
            if (!taskSchema.inputs.has(inputName)) {
              let lineInBlock;
              if (
                usedTolerantMode &&
                taskStep.inputLines instanceof Map &&
                taskStep.inputLines.has(inputName)
              ) {
                lineInBlock = taskStep.inputLines.get(inputName);
              } else {
                const inputPattern = new RegExp(`\\n\\s*${inputName}:`);
                lineInBlock = locateInBlock(normalizedBlockText, inputPattern, 1);
              }

              errors.push(
                createError(
                  relativeFilePath,
                  block.contentStartLine + lineInBlock - 1,
                  `[block ${blockIndex + 1}] Unknown task input '${inputName}' for '${taskStep.task}' (schema: ${taskSchema.sourceFile})`
                )
              );
            }
          }
        }

        if (taskStep.name) {
          knownAzdoStepOutputs.set(taskStep.name, taskSchema.outputs);
        }
      }

      const outputRefs = collectOutputReferences(normalizedBlockText);
      for (const outputRef of outputRefs) {
        const availableOutputs = knownStepOutputs.get(outputRef.stepId);
        if (!availableOutputs) {
          continue;
        }

        if (!availableOutputs.has(outputRef.outputName)) {
          errors.push(
            createError(
              relativeFilePath,
              block.contentStartLine + outputRef.lineInBlock - 1,
              `[block ${blockIndex + 1}] Unknown output '${outputRef.outputName}' for step id '${outputRef.stepId}'`
            )
          );
        }
      }

      const azureOutputRefs = collectAzureOutputReferences(normalizedBlockText);
      for (const outputRef of azureOutputRefs) {
        const availableOutputs = knownAzdoStepOutputs.get(outputRef.stepName);
        if (!availableOutputs) {
          continue;
        }

        const hasOutput =
          availableOutputs.has(outputRef.outputName) ||
          [...availableOutputs].some(
            (name) => name.toLowerCase() === outputRef.outputName.toLowerCase()
          );

        if (!hasOutput) {
          errors.push(
            createError(
              relativeFilePath,
              block.contentStartLine + outputRef.lineInBlock - 1,
              `[block ${blockIndex + 1}] Unknown task output '${outputRef.outputName}' for step name '${outputRef.stepName}'`
            )
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Found ${errors.length} docs sample validation error(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Docs samples validation passed. Scanned ${scannedBlocks} YAML block(s), validated ${validatedGitHubSteps} GitHub action step(s) and ${validatedAzdoTasks} Azure Pipelines task step(s).`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`docs sample validation failed: ${message}`);
  process.exitCode = 1;
});
