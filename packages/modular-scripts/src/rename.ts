import { Project } from 'ts-morph';
import execa from 'execa';
import type { CoreProperties } from '@schemastore/package';
import actionPreflightCheck from './utils/actionPreflightCheck';
import getModularRoot from './utils/getModularRoot';
import getWorkspaceInfo from './utils/getWorkspaceInfo';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as logger from './utils/logger';
import { cleanGit, stashChanges } from './utils/gitActions';

process.on('SIGINT', () => {
  stashChanges();
  process.exit(1);
});

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

  if (!cleanGit(process.cwd())) {
    throw new Error(
      'You have unsaved changes. Please save or stash them before we attempt to rename a package.',
    );
  }

  try {
    const packageJsonLocation = path.join(
      workspacePackage.location,
      './package.json',
    );

    const packageJson = (await fs.readJson(
      packageJsonLocation,
    )) as CoreProperties;

    logger.log(
      `Changing package name ${packageJson.name as string} → ${newPackageName}`,
    );
    packageJson.name = newPackageName;

    await fs.writeJson(packageJsonLocation, packageJson, { spaces: 2 });

    logger.log(`Rewriting imports in source files`);
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
            if (
              importDeclaration.getModuleSpecifierValue() === oldPackageName
            ) {
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
  } catch (err) {
    logger.error(err as string);
    stashChanges();
  }
}

export default actionPreflightCheck(rename);
