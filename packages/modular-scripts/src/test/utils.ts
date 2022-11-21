import _rimraf from 'rimraf';
import execa from 'execa';
import fs, { writeJSONSync } from 'fs-extra';
import path from 'path';
import * as tmp from 'tmp';
import { promisify } from 'util';

import getModularRoot from '../utils/getModularRoot';
import type { ModularPackageJson } from '@modular-scripts/modular-types';
import { mkdirSync } from 'fs';
import type { Config } from '@jest/types';

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
 * Creates a temporary Modular repo test environment with a default package.json and an empty packages workspace.
 * Modular node_modules is symlinked in the parent directory to provide all required dependencies without installing them.
 *
 * Use to create a clean context to run tests in where you can call `yarn modular` commands
 * without having to install dependencies nor tests within the main Modular repo.
 * @returns Path to temporary directory
 */
export function createModularTestContext(): string {
  // Modular node_modules are copied in the parent folder
  const tempDir = tmp.dirSync().name;
  fs.symlinkSync(
    path.join(modularRoot, 'node_modules'),
    path.join(tempDir, 'node_modules'),
  );

  // Actual mock modular repo is nested in the temp directory so that it can have its own clean node_modules
  const tempModularRepo = path.join(tempDir, 'temp_repo');
  mkdirSync(tempModularRepo);

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

/**
 * Mocks the installation of a template in the provided modular repo to avoid running `yarn` or installing it from a registry.
 *
 * Copies the template into a Templates workspace and symlinks them in node_modules so that it can be picked up by modular add.
 * @param templatePath Path to directory containing templates
 * @param modularRepo Modular repo in which to install them
 */
export function mockInstallTemplate(
  templatePath: string,
  modularRepo: string,
): void {
  const tempTemplatesPath = path.join(modularRepo, 'templates');
  const templateName = path.basename(templatePath);

  // Copy the template into the temporary repo
  fs.copySync(templatePath, path.join(tempTemplatesPath, templateName));

  // Symlink the templates into node_modules
  const tempRepoNodeModules = path.join(modularRepo, 'node_modules');
  if (!fs.existsSync(tempRepoNodeModules)) fs.mkdirSync(tempRepoNodeModules);

  fs.symlinkSync(
    path.join(tempTemplatesPath, templateName),
    path.join(tempRepoNodeModules, templateName),
  );
}

/**
 * Generates the Jest --config flag contents to pass when calling Jest based on config JSON provided
 *
 * - On Mac, it will provide a stringyfied version of the config JSON provided
 *
 * - On Windows, it will write the config JSON to a file in a temp directory and provde the path to pass
 */
export function generateJestConfig(jestConfig: Config.InitialOptions): string {
  if (process.platform === 'win32') {
    const tempConfigPath = path.join(
      tmp.dirSync().name,
      'temp-jest-config.json',
    );
    writeJSONSync(tempConfigPath, jestConfig);
    return `${tempConfigPath}`;
  } else {
    return `${JSON.stringify(jestConfig)}`;
  }
}
