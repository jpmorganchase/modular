import { Project } from 'ts-morph';
import actionPreflightCheck from './utils/actionPreflightCheck';
import getModularRoot from './utils/getModularRoot';
import getWorkspaceInfo, { WorkSpaceRecord } from './utils/getWorkspaceInfo';
import * as fs from 'fs-extra';
import * as path from 'path';

// Derive types from array; this is handy to iterate against it later
const dependencyTypes = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
] as const;

type DependencyType = typeof dependencyTypes[number];

type DependencyObject = {
  [key in DependencyType]: Record<string, string>;
};

interface PackageJson extends Partial<DependencyObject> {
  name: string;
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

  // Rename the directory. Do it first because this fails if there's a collision and we don't want to clean up later
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
  type PackageDepInfo = { packageData: WorkSpaceRecord; json: PackageJson };

  const dependingPackages: PackageDepInfo[] = (
    await Promise.all(
      workspace
        .filter(([packageName]) => packageName !== oldPackageName)
        .map(async ([_, packageData]) => ({
          packageData,
          json: (await fs.readJson(
            path.join(getModularRoot(), packageData.location, './package.json'),
          )) as PackageJson,
        })),
    )
  ).filter((pkgJsonInfo) =>
    dependencyTypes.some(
      (depField) => pkgJsonInfo.json[depField]?.[oldPackageName],
    ),
  );

  // Change dependency name in depending packages, mutating the package object.
  await Promise.all(
    dependingPackages.map(async (pkg) => {
      let modified = false;
      dependencyTypes.forEach((depField) => {
        // Needs to be explicitly assigned, otherwise Typescript doesn't understand it's defined
        const depObject = pkg.json[depField];
        if (depObject?.[oldPackageName]) {
          depObject[newPackageName] = depObject[oldPackageName];
          delete pkg.json[depField]?.[oldPackageName];
          modified = true;
        }
      });
      if (modified) {
        await fs.writeJson(
          path.join(
            getModularRoot(),
            pkg.packageData.location,
            './package.json',
          ),
          pkg.json,
          { spaces: 2 },
        );
      }
    }),
  );

  // Change imports in depending packages
  dependingPackages.map(async (pkg) => {
    const project = new Project();
    project.addSourceFilesAtPaths(
      path.join(
        getModularRoot(),
        pkg.packageData.location,
        'src/**/*{.d.ts,.ts,.tsx}',
      ),
    );
    const sourceFiles = project.getSourceFiles();

    sourceFiles.forEach((sourceFile) => {
      const imports = sourceFile.getImportDeclarations();
      imports.forEach((importDeclaration) => {
        if (importDeclaration.getModuleSpecifierValue() === oldPackageName) {
          console.log(importDeclaration.getModuleSpecifierValue());
          importDeclaration.setModuleSpecifier(newPackageName);
        }
      });
    });
    await project.save();
  });
}

export default actionPreflightCheck(rename);
