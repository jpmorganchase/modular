import actionPreflightCheck from './utils/actionPreflightCheck';
import getModularRoot from './utils/getModularRoot';
import getWorkspaceInfo from './utils/getWorkspaceInfo';
import * as fs from 'fs-extra';
import * as path from 'path';

interface PackageJson {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

async function rename(
  oldPackageName: string,
  newPackageName: string,
): Promise<void> {
  const workspace = Object.entries(await getWorkspaceInfo());

  const oldPackage = workspace.find(
    ([packageName]) => packageName === oldPackageName,
  )?.[1];
  if (!oldPackage) {
    throw new Error(`Package ${oldPackageName} not found.`);
  }

  if (workspace.find(([packageName]) => packageName === newPackageName)) {
    throw new Error(`Package ${newPackageName} already exists.`);
  }

  // Change name in package.json
  const oldPackageJsonLocation = path.join(
    getModularRoot(),
    oldPackage.location,
    './package.json',
  );
  const packageJson = (await fs.readJson(
    oldPackageJsonLocation,
  )) as PackageJson;

  packageJson.name = newPackageName;

  await fs.writeJSON(oldPackageJsonLocation, packageJson, { spaces: 2 });

  // Rename the directory
  const newPackageLocation = path.join(
    getModularRoot(),
    path.join(oldPackage.location, '..'),
    newPackageName,
  );

  console.log(
    oldPackageJsonLocation,
    newPackageLocation,
    path.join(oldPackage.location, '..'),
  );

  await fs.move(oldPackage.location, newPackageLocation);

  console.log('Renaming', oldPackageName, 'to', newPackageName);
}

export default actionPreflightCheck(rename);
