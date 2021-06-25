import { getWorkspaceInfo, WorkSpaceRecord } from './utils/getWorkspaceInfo';
import { getModularType, isValidModularType } from './utils/isModularType';
import * as logger from './utils/logger';
type VerifyPackageTree = () => void;

export async function check(): Promise<void> {
  // ensure that workspaces are setup correctly with yarn§
  // init is a special case where we don't already need to be in a modular repository
  // in this case there's no use checking the workspaces yet because we're setting
  // up a new folder
  const workspace = await getWorkspaceInfo();

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

    if (!isValidModularType(packageInfo.location)) {
      throw new Error(
        `${packageName} at ${
          packageInfo.location
        } is not a valid modular type - Found ${
          getModularType(packageInfo.location) as string
        }`,
      );
    }

    logger.debug(`${packageName} is valid.`);
  }

  const verifyPackageTree =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react-scripts/scripts/utils/verifyPackageTree') as VerifyPackageTree;
  verifyPackageTree();
}
