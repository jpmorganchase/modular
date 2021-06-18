import * as fs from 'fs-extra';
import * as path from 'path';
import execSync from './utils/execSync';
import { ModularPackageJson } from './utils/isModularType';

export async function initModularFolder(
  folder: string,
  initOverride: boolean,
): Promise<void> {
  const packageJsonPath = path.join(folder, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    const args = ['init'];
    if (initOverride) {
      args.push('-y');
    }
    execSync('npm', args, {
      cwd: folder,
    });
  }

  const packageJson = (await fs.readJSON(
    packageJsonPath,
  )) as ModularPackageJson;

  let changed = false;
  if (!packageJson.modular) {
    packageJson.modular = {
      type: 'root',
    };
    changed = true;
  }

  if (!packageJson.workspaces) {
    packageJson.workspaces = ['packages/**'];
  }

  if (changed) {
    await fs.writeJSON(packageJsonPath, packageJson, {
      spaces: 2,
    });
  }

  await fs.mkdirp(path.join(folder, 'modular'));
  await fs.mkdirp(path.join(folder, 'packages'));

  console.log('Modular repository initialized!');
}

export default function init(initOverride = false): Promise<void> {
  return initModularFolder(process.cwd(), initOverride);
}
