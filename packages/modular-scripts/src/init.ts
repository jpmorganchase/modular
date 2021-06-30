import * as fs from 'fs-extra';
import * as path from 'path';
import execSync from './utils/execSync';
import { ModularPackageJson } from './utils/isModularType';
import * as logger from './utils/logger';

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

  packageJson.modular = {
    type: 'root',
  };

  packageJson.private = true;

  if (!packageJson.workspaces) {
    packageJson.workspaces = ['packages/**'];
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
  execSync('npm', args, {
    cwd: folder,
  });

  // If this project already has modular root folders/files, don't overwrite
  // Otherwise, set up the initialized repo with the standard modular root folders/files
  const rootTemplatePath = path.join(__dirname, '../types', 'root');
  fs.readdirSync(rootTemplatePath).forEach((dir) => {
    if (!fs.existsSync(path.join(folder, dir))) {
      fs.copySync(path.join(rootTemplatePath, dir), path.join(folder, dir));
    }
  });

  const yarnArgs = ['--silent'];
  if (preferOffline) {
    yarnArgs.push('--prefer-offline');
  }
  execSync('yarnpkg', yarnArgs, { cwd: folder });

  logger.log('Modular repository initialized!');
}

export default function init(
  initOverride = false,
  preferOffline = true,
): Promise<void> {
  return initModularFolder(process.cwd(), initOverride, preferOffline);
}
