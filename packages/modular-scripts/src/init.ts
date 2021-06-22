import * as fs from 'fs-extra';
import * as path from 'path';
import execSync from './utils/execSync';
import { ModularPackageJson } from './utils/isModularType';

export async function initModularFolder(
  folder: string,
  initOverride: boolean,
  preferOffline = true,
): Promise<void> {
  const packageJsonPath = path.join(folder, 'package.json');

  let packageJson: Partial<ModularPackageJson>;

  try {
    packageJson = (await fs.readJSON(packageJsonPath)) as ModularPackageJson;
  } catch (e) {
    packageJson = {};
  }

  let changed = false;
  if (!packageJson.modular) {
    packageJson.modular = {
      type: 'root',
    };
    changed = true;
  }

  packageJson.private = true;

  if (!packageJson.workspaces) {
    packageJson.workspaces = ['packages/**'];
  }

  if (changed) {
    await fs.writeJSON(packageJsonPath, packageJson, {
      spaces: 2,
    });
  }

  // now run npm init to ensure that our new content is picked up properly.
  // we don't do this before because npm init prints the package.json to console
  // at the end - so we want our new values to also be picked up.
  const args = ['init'];
  if (initOverride) {
    args.push('-y');
  }
  execSync('npm', args, {
    cwd: folder,
  });

  await fs.mkdirp(path.join(folder, 'modular'));
  await fs.mkdirp(path.join(folder, 'packages'));

  const yarnArgs = ['--silent'];
  if (preferOffline) {
    yarnArgs.push('--prefer-offline');
  }
  execSync('yarnpkg', yarnArgs, { cwd: folder });

  console.log('Modular repository initialized!');
}

export default function init(
  initOverride = false,
  preferOffline = true,
): Promise<void> {
  return initModularFolder(process.cwd(), initOverride, preferOffline);
}
