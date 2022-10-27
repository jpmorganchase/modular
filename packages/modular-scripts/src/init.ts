import * as fs from 'fs-extra';
import * as path from 'path';
import { defaultBrowsers } from './utils/checkBrowsers';
import execAsync from './utils/execAsync';
import * as logger from './utils/logger';

import type { ModularPackageJson } from '@modular-scripts/modular-types';

export async function initModularFolder(
  folder: string,
  initOverride: boolean,
  preferOffline = true,
  verbose = false,
): Promise<void> {
  const packageJsonPath = path.join(folder, 'package.json');

  let packageJson: Partial<ModularPackageJson>;

  try {
    packageJson = (await fs.readJSON(packageJsonPath)) as ModularPackageJson;
  } catch (e) {
    packageJson = {};
  }

  packageJson.modular = {
    type: 'root',
  };

  packageJson.private = true;

  if (!packageJson.workspaces) {
    packageJson.workspaces = ['packages/**'];
  }

  if (!packageJson.browserslist) {
    packageJson.browserslist = defaultBrowsers;
  }

  await fs.writeJSON(packageJsonPath, packageJson, {
    spaces: 2,
  });

  // now run npm init to ensure that our new content is picked up properly.
  // we don't do this before because npm init prints the package.json to console
  // at the end - so we want our new values to also be picked up.
  const args = ['init'];
  if (initOverride) {
    args.push('-y');
  }
  await execAsync('npm', args, {
    cwd: folder,
  });

  await fs.mkdirp(path.join(folder, 'modular'));
  await fs.mkdirp(path.join(folder, 'packages'));

  const yarnArgs = verbose ? ['--verbose'] : ['--silent'];
  if (preferOffline) {
    yarnArgs.push('--prefer-offline');
  }
  await execAsync('yarnpkg', yarnArgs, { cwd: folder });

  logger.log('Modular repository initialized!');
}

export default function init(
  initOverride = false,
  preferOffline = true,
  verbose = false,
): Promise<void> {
  return initModularFolder(process.cwd(), initOverride, preferOffline, verbose);
}
