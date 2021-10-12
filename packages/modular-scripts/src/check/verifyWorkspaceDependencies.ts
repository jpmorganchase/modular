import * as path from 'path';
import getModularRoot from '../utils/getModularRoot';
import getWorkspaceInfo from '../utils/getWorkspaceInfo';
import { getModularType, isValidModularType } from '../utils/isModularType';
import * as logger from '../utils/logger';

export default async function verifyWorkspaceStructure(): Promise<boolean> {
  let failed = false;

  const modularRoot = getModularRoot();

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

  return failed;
}
