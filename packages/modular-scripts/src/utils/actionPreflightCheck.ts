import { getWorkspaceInfo } from '../utils/getWorkspaceInfo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModularAction = (...args: any[]) => Promise<void>;

function actionPreflightCheck(fn: ModularAction): ModularAction {
  const wrappedFn: ModularAction = async (...args) => {
    if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
      // ensure that workspaces are setup correctly with yarn
      // init is a special case where we don't already need to be in a modular repository
      // in this case there's no use checking the workspaces yet because we're setting
      // up a new folder
      const workspace = await getWorkspaceInfo();

      for (const [packageName, packageInfo] of Object.entries(workspace)) {
        if (packageInfo?.mismatchedWorkspaceDependencies.length) {
          throw new Error(
            `${packageName} has mismatchedWorkspaceDependencies ${packageInfo.mismatchedWorkspaceDependencies.join(
              ', ',
            )}`,
          );
        }
      }
    }

    return fn(...args);
  };

  return wrappedFn;
}

export default actionPreflightCheck;
