import getWorkspaceInfo from '../utils/getWorkspaceInfo';
import { isValidModularType } from '../utils/packageTypes';
import * as logger from '../utils/logger';

export async function check(target?: string): Promise<boolean> {
  let valid = true;
  // ensure that workspaces are setup correctly with yarn
  // init is a special case where we don't already need to be in a modular repository
  // in this case there's no use checking the workspaces yet because we're setting
  // up a new folder
  const workspace = await getWorkspaceInfo(target);
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
      valid = false;
    }

    if (!isValidModularType(packageInfo.type)) {
      logger.error(
        `${packageName} at ${
          packageInfo.location
        } is not a valid modular type - Found ${packageInfo.type as string}`,
      );
      valid = false;
    }

    if (packageInfo.type === 'app' && packageInfo.public) {
      logger.error(
        `${packageName} is marked as "public" - Modular apps should be marked as private.`,
      );
      valid = false;
    }

    logger.debug(`${packageName} is valid.`);
  }

  return valid;
}
