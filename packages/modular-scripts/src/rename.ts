import { Project } from 'ts-morph';
import execa from 'execa';
import actionPreflightCheck from './utils/actionPreflightCheck';
import getModularRoot from './utils/getModularRoot';
import getWorkspaceInfo from './utils/getWorkspaceInfo';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as logger from './utils/logger';

// Derive types from array; this is handy to iterate against it later
const dependencyTypes = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
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
  const workspace = await getWorkspaceInfo();

  logger.debug(`Checking for existence of ${oldPackageName} in workspace.`);
  const workspacePackage = workspace[oldPackageName];
  if (!workspacePackage) {
    throw new Error(`Package ${oldPackageName} not found.`);
  }
  logger.debug(`Checking for collision with ${newPackageName} in workspace.`);
  if (workspace[newPackageName]) {
    throw new Error(`Package ${newPackageName} already exists.`);
  }

  const packageJsonLocation = path.join(
    workspacePackage.location,
    './package.json',
  );

  const packageJson = (await fs.readJson(packageJsonLocation)) as PackageJson;

  logger.log(`Changing package name ${packageJson.name} → ${newPackageName}`);
  packageJson.name = newPackageName;

  await fs.writeJson(packageJsonLocation, packageJson, { spaces: 2 });

  logger.log(
    `Renaming explicit dependencies to ${oldPackageName} in the workspace`,
  );

  await Promise.all(
    Object.values(workspace).map(async (packageData) => {
      const packageJsonPath = path.join(
        getModularRoot(),
        packageData.location,
        './package.json',
      );
      const packageJson = (await fs.readJson(packageJsonPath)) as PackageJson;

      const isFileModified = dependencyTypes.reduce(
        (changed, dependencyType) => {
          const depObject = packageJson[dependencyType];
          if (depObject?.[oldPackageName]) {
            logger.debug(
              `Renaming dependency ${oldPackageName} → ${newPackageName} in ${dependencyType} / ${packageData.location}`,
            );
            depObject[newPackageName] = depObject[oldPackageName];
            delete packageJson[dependencyType]?.[oldPackageName];
            return true;
          }
          return changed;
        },
        false,
      );

      return isFileModified
        ? await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 })
        : null;
    }),
  );

  logger.log(`Rewriting imports in packages`);
  await Promise.all(
    Object.values(workspace).map(async (packageData) => {
      const project = new Project();
      project.addSourceFilesAtPaths(
        path.join(
          getModularRoot(),
          packageData.location,
          'src/**/*{.d.ts,.ts,.js,.jsx,.tsx}',
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

  logger.log(`Refreshing packages`);
  execa.sync('yarnpkg');
}

export default actionPreflightCheck(rename);
