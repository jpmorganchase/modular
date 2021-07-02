import * as path from 'path';
import { getWorkspaceInfo, WorkSpaceRecord } from './utils/getWorkspaceInfo';
import {
  getModularType,
  isValidModularType,
  isValidModularRootPackageJson,
} from './utils/isModularType';
import * as logger from './utils/logger';
import getModularRoot from './utils/getModularRoot';

export async function check(): Promise<void> {
  // ensure that workspaces are setup correctly with yarn§
  // init is a special case where we don't already need to be in a modular repository
  // in this case there's no use checking the workspaces yet because we're setting
  // up a new folder
  const workspace = await getWorkspaceInfo();
  const modularRoot = getModularRoot();

  if (!isValidModularRootPackageJson(modularRoot)) {
    throw new Error(
      'Your root package.json file has a missing modular type, workspaces, or is not marked private',
    );
  }
  for (const [packageName, _packageInfo] of Object.entries(workspace)) {
    const packageInfo = _packageInfo as WorkSpaceRecord;

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

  if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
    const { verifyPackageTree } = await import('./utils/verifyPackageTree');
    await verifyPackageTree();
  }
}
