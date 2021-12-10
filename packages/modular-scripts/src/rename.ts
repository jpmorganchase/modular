import { Project } from 'ts-morph';
import actionPreflightCheck from './utils/actionPreflightCheck';
import getModularRoot from './utils/getModularRoot';
import getWorkspaceInfo, { WorkSpaceRecord } from './utils/getWorkspaceInfo';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as logger from './utils/logger';

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

  logger.debug(`Checking for existence of ${oldPackageName} in workspace.`);
  const oldPackage = workspace.find(
    ([packageName]) => packageName === oldPackageName,
  )?.[1];
  if (!oldPackage) {
    throw new Error(`Package ${oldPackageName} not found.`);
  }
  logger.debug(`Checking for collision with ${newPackageName} in workspace.`);
  if (workspace.find(([packageName]) => packageName === newPackageName)) {
    throw new Error(`Package ${newPackageName} already exists.`);
  }

  // Rename the directory. Do it first because this fails if there's a collision and we don't want to clean up later
  const newPackageLocation = path.join(
    getModularRoot(),
    path.join(oldPackage.location, '..'),
    newPackageName,
  );

  logger.log(`Moving ${oldPackage.location} → ${newPackageLocation}`);

  await fs.move(oldPackage.location, newPackageLocation);

  // Change name in package.json
  const newPackageJsonLocation = path.join(
    newPackageLocation,
    './package.json',
  );

  const packageJson = (await fs.readJson(
    newPackageJsonLocation,
  )) as PackageJson;

  logger.log(`Changing package name ${packageJson.name} → ${newPackageName}`);
  packageJson.name = newPackageName;

  await fs.writeJson(newPackageJsonLocation, packageJson, { spaces: 2 });

  // Search for packages that depend on the renamed package
  type PackageDepInfo = { packageData: WorkSpaceRecord; json: PackageJson };

  logger.log(`Searching for packages depending on ${oldPackageName}`);
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

  logger.log(`Renaming dependencies in depending packages`);
  await Promise.all(
    dependingPackages.map(async (pkg) => {
      let modified = false;
      dependencyTypes.forEach((depField) => {
        // This needs to be explicitly assigned, otherwise Typescript doesn't understand it's defined
        const depObject = pkg.json[depField];
        if (depObject?.[oldPackageName]) {
          logger.debug(
            `Renaming dependency ${oldPackageName} → ${newPackageName} in ${depField} / ${pkg.packageData.location}`,
          );
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

  logger.log(`Rewriting imports in depending packages`);
  await Promise.all(
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
            logger.debug(
              `Rewriting \`${importDeclaration.getText()}\` in ${sourceFile.getFilePath()}`,
            );
            importDeclaration.setModuleSpecifier(newPackageName);
          }
        });
      });
      await project.save();
    }),
  );
}

export default actionPreflightCheck(rename);
