import execa from 'execa';
import type { CoreProperties } from '@schemastore/package';
import actionPreflightCheck from './utils/actionPreflightCheck';
import getModularRoot from './utils/getModularRoot';
import getWorkspaceInfo from './utils/getWorkspaceInfo';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as logger from './utils/logger';
import { cleanGit, stashChanges } from './utils/gitActions';

interface ModularJson {
  type: string;
  templateType: string | undefined;
}

process.on('SIGINT', () => {
  stashChanges();
  process.exit(1);
});

async function convertToTemplate(packageName: string): Promise<void> {
  const workspace = await getWorkspaceInfo();
  const templateName = `modular-template-${packageName}`;

  logger.debug(`Checking for existence of ${packageName} in workspace.`);
  const workspacePackage = workspace[packageName];
  if (!workspacePackage) {
    throw new Error(`Package ${packageName} not found.`);
  }
  logger.debug(`Checking for collision with ${templateName} in workspace.`);
  if (workspace[templateName]) {
    throw new Error(`Template ${templateName} already exists.`);
  }

  if (!cleanGit(process.cwd())) {
    throw new Error(
      'You have unsaved changes. Please save or stash them before we attempt to convert a package.',
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
      `Converting package ${
        packageJson.name as string
      } to template ${templateName}`,
    );
    packageJson.name = templateName;

    const modularJson = packageJson.modular as ModularJson;
    const packageType = modularJson.type;
    const newPackageType = 'template';

    const newModularJson: ModularJson = {
      type: newPackageType,
      templateType: packageType,
    };

    packageJson.modular = newModularJson;

    await fs.writeJson(packageJsonLocation, packageJson, { spaces: 2 });

    logger.log(`Refreshing packages`);
    execa.sync('yarnpkg', ['--silent'], { cwd: getModularRoot() });
  } catch (err) {
    logger.error(err as string);
    stashChanges();
  }
}

export default actionPreflightCheck(convertToTemplate);
