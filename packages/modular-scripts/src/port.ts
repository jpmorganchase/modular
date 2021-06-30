import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import * as fs from 'fs-extra';
import * as path from 'path';
import actionPreflightCheck from './utils/actionPreflightCheck';
import addPackage from './addPackage';
import rimraf from 'rimraf';

export async function port(relativePath: string): Promise<void> {
  try {
    // const modularRoot = getModularRoot();
    const targetedAppPath = path.resolve(relativePath);
    console.log('targetedAppPath: ', targetedAppPath);
    const targetedAppPackageJson = (await fs.readJSON(
      path.join(targetedAppPath, 'package.json'),
    )) as PackageJson;
    const targetedAppName = targetedAppPackageJson.name;
    await addPackage(targetedAppName, 'app', targetedAppName);
    // Replace the template src and public folders with current react app folders
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
  } catch (err) {
    console.log(err);
  }
}

export default actionPreflightCheck(port);
