import globby from 'globby';
import * as fs from 'fs-extra';
import * as path from 'path';

import getWorkspaceInfo from './utils/getWorkspaceInfo';
import {
  getModularType,
  isValidModularType,
  ModularPackageJson,
} from './utils/isModularType';
import * as logger from './utils/logger';
import getModularRoot from './utils/getModularRoot';

export async function check(): Promise<void> {
  let failed = false;
  const modularRoot = getModularRoot();

  const rootPackageJsonPath = path.join(modularRoot, 'package.json');
  const rootPackageJson = (await fs.readJSON(
    rootPackageJsonPath,
  )) as ModularPackageJson;
  if (!rootPackageJson.private) {
    logger.error(`Modular workspace roots must be marked as private`);
    failed = true;
  }

  if (!rootPackageJson?.workspaces?.includes('packages/**')) {
    logger.error(
      `Modular workspaces must include "packages/**" to pick up any modular packages in the worktree`,
    );
    failed = true;
  }

  // ensure that workspaces are setup correctly with yarn
  // init is a special case where we don't already need to be in a modular repository
  // in this case there's no use checking the workspaces yet because we're setting
  // up a new folder
  const workspace = await getWorkspaceInfo();

  /**
   * Validate the structure of the workspace to ensure there's no mismatched dependencies and that
   * all the workspaces are valid modular package types.
   */
  for (const [packageName, packageInfo] of Object.entries(workspace)) {
    if (packageInfo.mismatchedWorkspaceDependencies.length) {
      logger.error(
        `${packageName} has mismatchedWorkspaceDependencies ${packageInfo.mismatchedWorkspaceDependencies.join(
          ', ',
        )}`,
      );
      failed = true;
    }

    if (!packageInfo.location.startsWith('packages')) {
      logger.error(
        `${packageName} is not located within the "/packages" directory in the repository, instead found "${packageInfo.location}"`,
      );
      failed = true;
    }

    if (!isValidModularType(path.join(modularRoot, packageInfo.location))) {
      logger.error(
        `${packageName} at ${
          packageInfo.location
        } is not a valid modular type - Found ${
          getModularType(packageInfo.location) as string
        }`,
      );
      failed = true;
    }

    if (packageInfo.type === 'app') {
      if (packageInfo.public) {
        logger.error(
          `${packageName} is marked as "public" - Modular apps should be marked as private.`,
        );
        failed = true;
      }
    }

    logger.debug(`${packageName} is valid.`);
  }

  /**
   * Validate the the worktrree is valid against the globby of pacakge.json files which are found in the
   * current working directory. They should be the same but you never know...
   */
  const workspaces = Object.values(workspace).map((w) => w.location);

  const workspaceLocations: string[] = (
    await globby(['packages/**/package.json', '!**/node_modules/**'], {
      onlyFiles: true,
      cwd: modularRoot,
    })
  ).map((l) => path.dirname(l));

  workspaces.forEach((workspaceLocation) => {
    const overlapping = workspaceLocations.filter((otherWorkspaceLocation) => {
      // obviously workspaces which are the same can't be overlapping
      const relative = path.relative(workspaceLocation, otherWorkspaceLocation);
      return (
        relative && !relative.startsWith('..') && !path.isAbsolute(relative)
      );
    });
    if (overlapping.length) {
      logger.error(
        `Found ${workspaceLocation} which is an overlapping workspace with ${overlapping.join(
          ', ',
        )} in your current worktree`,
      );
      failed = true;
    }
  });

  const { verifyPackageTree } = await import('./utils/verifyPackageTree');
  failed = await verifyPackageTree();

  if (failed) {
    throw new Error(`The above errors were found during modular check`);
  }
}
