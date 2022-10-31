import _rimraf from 'rimraf';
import execa from 'execa';
import fs from 'fs-extra';
import path from 'path';
import * as tmp from 'tmp';
import { promisify } from 'util';

import getModularRoot from '../utils/getModularRoot';
import type { ModularPackageJson } from '@modular-scripts/modular-types';

const rimraf = promisify(_rimraf);

const modularRoot = getModularRoot();

export function modular(
  str: string,
  opts: Record<string, unknown> = {},
): execa.ExecaChildProcess<string> {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd: modularRoot,
    cleanup: true,
    ...opts,
  });
}

export async function cleanup(packageNames: Array<string>): Promise<void> {
  const packagesPath = path.join(modularRoot, 'packages');
  const distPath = path.join(modularRoot, 'dist');

  for (const packageName of packageNames) {
    await rimraf(path.join(packagesPath, packageName));
    await rimraf(path.join(distPath, packageName));
  }

  // run yarn so yarn.lock gets reset
  await execa('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

export async function addFixturePackage(
  name: string,
  options: { copy: boolean } = { copy: true },
): Promise<void> {
  const packageSrcDir = path.join(modularRoot, 'packages', name, 'src');
  await modular(`add ${name} --unstable-type package`, {
    stdio: 'inherit',
  });
  await fs.emptyDir(packageSrcDir);

  if (options.copy) {
    await fs.copy(
      path.join(__dirname, '..', '__tests__', '__fixtures__', 'packages', name),
      packageSrcDir,
    );
  }
}

/**
 * Creates a temporary Modular repo with the provided templates 'installed' and Modular node_modules symlinked
 * @param templatesPath Path to fixture to copy in
 * @returns Path to temporary directory
 */
export function createModularTestContext(templatesPath: string): string {
  // Modular node_modules are copied in the parent folder
  const tempDir = tmp.dirSync().name;
  fs.symlinkSync(
    path.join(modularRoot, 'node_modules'),
    path.join(tempDir, 'node_modules'),
  );

  // Actual mock modular repo is nested underneath so that it can have it's own node_modules
  const tempModularRepo = path.join(tempDir, 'temp_repo');
  const tempTemplatesPath = path.join(tempModularRepo, 'templates');

  // Copy in the templates
  fs.copySync(templatesPath, tempTemplatesPath);

  // Symlink the templates into node_modules
  const tempRepoNodeModules = path.join(tempModularRepo, 'node_modules');
  fs.mkdirSync(tempRepoNodeModules);
  const templates = fs.readdirSync(tempTemplatesPath);
  templates.forEach((template) =>
    fs.symlinkSync(
      path.join(tempTemplatesPath, template),
      path.join(tempRepoNodeModules, template),
    ),
  );

  // Create mock modular package.json
  const packageJson: Partial<ModularPackageJson> = {
    name: 'temp',
    license: 'MIT',
    private: true,
    modular: {
      type: 'root',
    },
    workspaces: ['packages/**', 'templates/**'],
    scripts: {
      modular: `ts-node ${modularRoot}/packages/modular-scripts/src/cli.ts`,
    },
    browserslist: {
      production: ['>0.2%', 'not dead', 'not op_mini all'],
      development: [
        'last 1 chrome version',
        'last 1 firefox version',
        'last 1 safari version',
      ],
    },
  };

  fs.writeJSONSync(path.join(tempModularRepo, 'package.json'), packageJson, {
    spaces: 2,
  });
  return tempModularRepo;
}
