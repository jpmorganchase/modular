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

  // Rename the directory
  const newPackageLocation = path.join(
    getModularRoot(),
    path.join(oldPackage.location, '..'),
    newPackageName,
  );

  await fs.move(oldPackage.location, newPackageLocation);

  // Change name in package.json
  const newPackageJsonLocation = path.join(
    newPackageLocation,
    './package.json',
  );

  const packageJson = (await fs.readJson(
    newPackageJsonLocation,
  )) as PackageJson;

  packageJson.name = newPackageName;

  await fs.writeJson(newPackageJsonLocation, packageJson, { spaces: 2 });

  // Search for packages that depend on the renamed package
  type PackageDepInfo = { location: string; json: PackageJson };

  const dependingPackages: PackageDepInfo[] = (
    await Promise.all(
      workspace
        .filter(([packageName]) => packageName !== oldPackageName)
        .map(async ([_, packageData]) => ({
          location: packageData.location,
          json: (await fs.readJson(
            path.join(getModularRoot(), packageData.location, './package.json'),
          )) as PackageJson,
        })),
    )
  ).filter(
    (pkgJsonInfo) =>
      pkgJsonInfo.json.dependencies?.[oldPackageName] ||
      pkgJsonInfo.json.devDependencies?.[oldPackageName] ||
      pkgJsonInfo.json.peerDependencies?.[oldPackageName],
  );

  console.log(dependingPackages);
}

export default actionPreflightCheck(rename);
