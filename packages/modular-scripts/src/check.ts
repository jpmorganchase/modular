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
  const modularRoot = getModularRoot();

  const rootPackageJsonPath = path.join(modularRoot, 'package.json');
  const rootPackageJson = (await fs.readJSON(
    rootPackageJsonPath,
  )) as ModularPackageJson;
  if (!rootPackageJson.private) {
    throw new Error(`Modular workspace roots must be marked as private`);
  }

  if (!rootPackageJson?.workspaces?.includes('packages/**')) {
    throw new Error(
      `Modular workspaces must include "packages/**" to pick up any modular packages in the worktree`,
    );
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
      throw new Error(
        `${packageName} has mismatchedWorkspaceDependencies ${packageInfo.mismatchedWorkspaceDependencies.join(
          ', ',
        )}`,
      );
    }

    if (!packageInfo.location.startsWith('packages')) {
      throw new Error(
        `${packageName} is not located within the "/packages" directory in the repository, instead found "${packageInfo.location}"`,
      );
    }

    if (!isValidModularType(path.join(modularRoot, packageInfo.location))) {
      throw new Error(
        `${packageName} at ${
          packageInfo.location
        } is not a valid modular type - Found ${
          getModularType(packageInfo.location) as string
        }`,
      );
    }

    if (packageInfo.type === 'app') {
      if (packageInfo.public) {
        throw new Error(
          `${packageName} is marked as "public" - Modular apps should be marked as private.`,
        );
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

  workspaces.forEach((l) => {
    const overlapping = workspaceLocations.filter((workspaceLocation) => {
      // obviously workspaces which are the same can't be overlapping
      if (workspaceLocation === l) {
        return false;
      } else {
        return workspaceLocation.startsWith(l);
      }
    });
    if (overlapping.length) {
      throw new Error(
        `Found ${l} which is an overlapping workspace with ${overlapping.join(
          ', ',
        )} in your current worktree`,
      );
    }
  });

  /**
   * Taken from react-scripts - this assets that we share common versions of utils which we depend on.
   */
  const { verifyPackageTree } = await import('./utils/verifyPackageTree');
  await verifyPackageTree();
}
