#!/usr/bin/env node

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { promises as fs } from 'fs';
import { rollup } from 'rollup';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const targets = [
  {
    name: 'Azure DevOps Task',
    packageDir: 'packages/azdo-task',
    entryPoint: 'packages/azdo-task/src/main.ts',
    outFile: 'packages/azdo-task/dist/bundle.js',
    external: [],
    bundleStandaloneTfxCli: true,
    runtimeAssetCopies: [
      {
        from: 'node_modules/azure-pipelines-tasks-azure-arm-rest/openssl3.4.0',
        to: 'openssl3.4.0',
      },
      {
        from: 'node_modules/azure-pipelines-tasks-azure-arm-rest/openssl3.4.2',
        to: 'openssl3.4.2',
      },
      {
        from: 'node_modules/azure-pipelines-tasks-azure-arm-rest/module.json',
        to: 'module.json',
      },
      {
        from: 'node_modules/azure-pipelines-tasks-azure-arm-rest/Strings',
        to: 'Strings',
      },
    ],
    manifestSources: [
      'packages/azdo-task/package.json',
      'packages/core/package.json',
      'package.json',
    ],
    bundleFormat: 'cjs',
  },
  {
    name: 'GitHub Action',
    packageDir: 'packages/github-action',
    entryPoint: 'packages/github-action/src/main.ts',
    outFile: 'packages/github-action/dist/bundle.js',
    external: [],
    bundleStandaloneTfxCli: true,
    manifestSources: [
      'packages/github-action/package.json',
      'packages/core/package.json',
      'package.json',
    ],
    bundleFormat: 'esm',
  },
];

const targetSelectors = {
  azdo: (target) => target.packageDir === 'packages/azdo-task',
  actions: (target) => target.packageDir === 'packages/github-action',
  all: () => true,
};

function createExternalMatcher(externals) {
  return (id) =>
    externals.some((dependency) => id === dependency || id.startsWith(`${dependency}/`));
}

function getRollupOutputFormat(bundleFormat) {
  if (bundleFormat === 'esm') {
    return 'es';
  }

  if (bundleFormat === 'cjs') {
    return 'cjs';
  }

  throw new Error(`Unsupported bundle format '${bundleFormat}'`);
}

function getIntro(target) {
  if (target.bundleFormat !== 'esm') {
    return undefined;
  }

  return `
import { fileURLToPath as __internal_fileURLToPath } from 'node:url';
import { dirname as __internal_dirname } from 'node:path';
const __filename = __internal_fileURLToPath(import.meta.url);
const __dirname = __internal_dirname(__filename);
`;
}

async function buildWithRollup(target) {
  const bundle = await rollup({
    input: path.join(rootDir, target.entryPoint),
    external: createExternalMatcher(target.external),
    plugins: [
      typescript({
        tsconfig: path.join(rootDir, target.packageDir, 'tsconfig.json'),
        module: 'Node16',
        moduleResolution: 'Node16',
        outDir: path.join(rootDir, target.packageDir, 'dist'),
        outputToFilesystem: false,
      }),
      nodeResolve({
        preferBuiltins: true,
      }),
      json({
        preferConst: true,
      }),
      commonjs({
        strictRequires: true,
        ignoreTryCatch: false,
        ignoreDynamicRequires: true,
      }),
    ],
    context: 'this',
  });

  try {
    await bundle.write({
      file: path.join(rootDir, target.outFile),
      format: getRollupOutputFormat(target.bundleFormat),
      sourcemap: false,
      exports: 'named',
      intro: getIntro(target),
      inlineDynamicImports: true,
    });
  } finally {
    await bundle.close();
  }
}

async function bundleStandaloneTfxCli(target) {
  if (!target.bundleStandaloneTfxCli) {
    return;
  }

  const stagedTfxDir = await ensureStandaloneTfxBundle();

  const distDir = path.join(rootDir, target.packageDir, 'dist');
  const tfxRuntimeDir = path.join(distDir, 'tfx');
  const launcherPath = path.join(distDir, 'tfx-cli.cjs');
  const launcherJsPath = path.join(distDir, 'tfx-cli.js');

  await fs.rm(tfxRuntimeDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
  await fs.cp(stagedTfxDir, tfxRuntimeDir, { recursive: true });
  await removeMapArtifacts(tfxRuntimeDir);

  await fs.writeFile(
    launcherPath,
    'const path = require("node:path");\nconst common = require("./tfx/lib/common");\ncommon.APP_ROOT = path.join(__dirname, "tfx");\ncommon.EXEC_PATH = process.argv.slice(2);\nrequire("./tfx/tfx-cli.js");\n',
    'utf8'
  );

  await fs.writeFile(launcherJsPath, 'import "./tfx-cli.cjs";\n', 'utf8');
}

let standaloneTfxBundleDirPromise;

async function ensureStandaloneTfxBundle() {
  if (standaloneTfxBundleDirPromise) {
    return standaloneTfxBundleDirPromise;
  }

  standaloneTfxBundleDirPromise = (async () => {
    const tfxBuildDir = path.join(rootDir, 'node_modules', 'tfx-cli', '_build');
    const tfxEntrypoint = path.join(tfxBuildDir, 'tfx-cli.js');
    const standaloneBuildRoot = path.join(rootDir, '.tmp', 'standalone-tfx-cli');
    const standaloneBundlePath = path.join(standaloneBuildRoot, 'tfx-cli.js');

    await fs.access(tfxEntrypoint);

    const bundle = await rollup({
      input: tfxEntrypoint,
      plugins: [
        nodeResolve({
          preferBuiltins: true,
        }),
        json({
          preferConst: true,
        }),
        commonjs({
          strictRequires: true,
          ignoreTryCatch: false,
          ignoreDynamicRequires: true,
        }),
      ],
      external: (id) => id.startsWith('node:'),
      context: 'this',
    });

    try {
      await fs.rm(standaloneBuildRoot, { recursive: true, force: true });
      await fs.mkdir(standaloneBuildRoot, { recursive: true });

      await bundle.write({
        file: standaloneBundlePath,
        format: 'cjs',
        sourcemap: false,
        exports: 'auto',
        inlineDynamicImports: true,
      });
    } finally {
      await bundle.close();
    }

    await fs.cp(path.join(tfxBuildDir, 'exec'), path.join(standaloneBuildRoot, 'exec'), {
      recursive: true,
    });
    await fs.cp(path.join(tfxBuildDir, 'lib'), path.join(standaloneBuildRoot, 'lib'), {
      recursive: true,
    });
    await fs.cp(
      path.join(rootDir, 'node_modules', 'tfx-cli', 'node_modules'),
      path.join(standaloneBuildRoot, 'node_modules'),
      {
        recursive: true,
      }
    );
    await fs.copyFile(
      path.join(tfxBuildDir, 'package.json'),
      path.join(standaloneBuildRoot, 'package.json')
    );

    return standaloneBuildRoot;
  })();

  return standaloneTfxBundleDirPromise;
}

async function readJson(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  const raw = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(raw);
}

let cachedRootLockfile;

async function readRootLockfile() {
  if (!cachedRootLockfile) {
    cachedRootLockfile = await readJson('package-lock.json');
  }

  return cachedRootLockfile;
}

function resolveLockedVersion(name, lockfile) {
  return lockfile?.packages?.[`node_modules/${name}`]?.version;
}

function resolveVersion(name, manifests) {
  for (const manifest of manifests) {
    if (manifest.dependencies?.[name]) {
      return manifest.dependencies[name];
    }
  }

  for (const manifest of manifests) {
    if (manifest.devDependencies?.[name]) {
      return manifest.devDependencies[name];
    }
  }

  return undefined;
}

async function writeRuntimeDependencyManifest(target) {
  const manifests = await Promise.all(target.manifestSources.map((source) => readJson(source)));
  const lockfile = await readRootLockfile();
  const packageManifest = manifests[0];
  const dependencies = {};

  for (const dependency of target.external) {
    const version =
      resolveLockedVersion(dependency, lockfile) ?? resolveVersion(dependency, manifests);
    if (!version) {
      throw new Error(
        `Unable to resolve version for external dependency '${dependency}' in ${target.name}`
      );
    }
    dependencies[dependency] = version;
  }

  const distDir = path.join(rootDir, target.packageDir, 'dist');
  const distPackage = {
    name: `${packageManifest.name}-runtime`,
    private: true,
    license: packageManifest.license || 'MIT',
    type: target.bundleFormat === 'esm' ? 'module' : 'commonjs',
    dependencies,
  };

  await fs.writeFile(
    path.join(distDir, 'package.json'),
    JSON.stringify(distPackage, null, 2) + '\n'
  );
  await fs.writeFile(
    path.join(distDir, 'runtime-dependencies.json'),
    JSON.stringify({ external: target.external, dependencies }, null, 2) + '\n'
  );
}

async function copyRuntimeAssets(target) {
  const copies = target.runtimeAssetCopies || [];
  if (copies.length === 0) {
    return;
  }

  const distDir = path.join(rootDir, target.packageDir, 'dist');

  for (const copy of copies) {
    const sourcePath = path.join(rootDir, copy.from);
    const targetPath = path.join(distDir, copy.to);
    const sourceStat = await fs.lstat(sourcePath);

    await fs.rm(targetPath, { recursive: true, force: true });

    if (sourceStat.isDirectory()) {
      await fs.cp(sourcePath, targetPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(`${command} ${args.join(' ')}`, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`));
    });
  });
}

async function installRuntimeDependencies(target) {
  const distDir = path.join(rootDir, target.packageDir, 'dist');
  const nodeModulesDir = path.join(distDir, 'node_modules');

  try {
    await fs.rm(nodeModulesDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  } catch {
    // Best effort; npm install can still proceed if node_modules was not present.
  }

  // On Windows, npm can fail with ENOTEMPTY when prior content still lingers.
  // Move any residual folder out of the way and delete it separately.
  try {
    await fs.access(nodeModulesDir);
    const staleDir = path.join(distDir, `node_modules.stale.${Date.now()}`);
    await fs.rename(nodeModulesDir, staleDir);
    await fs.rm(staleDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  } catch {
    // No residual node_modules directory to handle.
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const installArgs = [
    'install',
    '--omit=dev',
    '--omit=optional',
    '--no-package-lock',
    '--no-bin-links',
    '--install-links',
    'false',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
  ];

  console.log(`Installing runtime dependencies for ${target.name}...`);
  await runCommand(npmCommand, installArgs, distDir);
}

async function normalizeTextLineEndings(directory) {
  try {
    await fs.access(directory);
  } catch {
    return;
  }

  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const content = await fs.readFile(fullPath);

      // Skip likely binary files.
      if (content.includes(0)) {
        continue;
      }

      const normalized = content.toString('utf8').replace(/\r\n/g, '\n');
      if (normalized !== content.toString('utf8')) {
        await fs.writeFile(fullPath, normalized, 'utf8');
      }
    }
  }
}

async function removeDeclarationArtifacts(directory) {
  try {
    await fs.access(directory);
  } catch {
    return;
  }

  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (/\.d\.ts(\.map)?$/i.test(entry.name)) {
        await fs.rm(fullPath, { force: true });
      }
    }
  }
}

async function removeMapArtifacts(directory) {
  try {
    await fs.access(directory);
  } catch {
    return;
  }

  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (/\.map$/i.test(entry.name)) {
        await fs.rm(fullPath, { force: true });
      }
    }
  }
}

function resolveTargetsFromArgs() {
  const mode = (process.argv[2] || 'all').toLowerCase();
  const selector = targetSelectors[mode];

  if (!selector) {
    throw new Error(`Unknown bundle target '${mode}'. Use one of: all, azdo, actions`);
  }

  const selectedTargets = targets.filter(selector);
  if (selectedTargets.length === 0) {
    throw new Error(`No bundle targets matched mode '${mode}'`);
  }

  return selectedTargets;
}

async function bundle() {
  const selectedTargets = resolveTargetsFromArgs();

  for (const target of selectedTargets) {
    const distDir = path.join(rootDir, target.packageDir, 'dist');
    console.log(`Bundling ${target.name}...`);
    await buildWithRollup(target);
    await removeDeclarationArtifacts(distDir);
    await bundleStandaloneTfxCli(target);
    await removeMapArtifacts(distDir);

    await writeRuntimeDependencyManifest(target);
    await installRuntimeDependencies(target);
    await normalizeTextLineEndings(path.join(rootDir, target.packageDir, 'dist', 'node_modules'));
    await copyRuntimeAssets(target);
    console.log(`✓ ${target.name} bundled`);
  }
}

bundle().catch((err) => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
