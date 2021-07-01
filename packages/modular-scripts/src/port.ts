import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import * as fs from 'fs-extra';
import * as path from 'path';
import rimraf from 'rimraf';
import getModularRoot from './utils/getModularRoot'
import actionPreflightCheck from './utils/actionPreflightCheck';
import addPackage from './addPackage';
import { ModularPackageJson } from './utils/isModularType';

export async function port(relativePath: string): Promise<void> {
  try {
    const targetedAppPath = path.resolve(relativePath);
    const targetedAppPackageJson = (await fs.readJSON(
      path.join(targetedAppPath, 'package.json'),
    )) as PackageJson;
    const targetedAppName = targetedAppPackageJson.name as string;
    await addPackage(targetedAppName, 'app', targetedAppName);

    // Replace the template src and public folders with targeted app folders
    const srcFolders = ['src', 'public'];
    srcFolders.forEach((dir: string) => {
      if (fs.existsSync(path.join(targetedAppPath, dir))) {
        rimraf.sync(
          path.join(targetedAppPath, 'packages', targetedAppName, dir),
        );
        fs.moveSync(
          path.join(targetedAppPath, dir),
          path.join(targetedAppPath, 'packages', targetedAppName, dir),
        );
      }
    });

    const modularRoot = getModularRoot();
    const dependencies = ['dependencies', 'devDependencies'];
    const modularRootPackageJson = (await fs.readJSON(path.join(modularRoot, 'package.json'))) as ModularPackageJson;

    dependencies.forEach((dependency) => {
      const rootDep = modularRootPackageJson[dependency]
      const targetedDep = targetedAppPackageJson[dependency]
      const targetedDepList = Object.keys(targetedDep);
    })

  } catch (err) {
    console.log(err);
  }
}

export default actionPreflightCheck(port);
