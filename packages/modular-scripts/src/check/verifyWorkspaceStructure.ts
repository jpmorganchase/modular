import * as path from 'path';
import globby from 'globby';
import getModularRoot from '../utils/getModularRoot';
import getWorkspaceInfo from '../utils/getWorkspaceInfo';
import * as logger from '../utils/logger';

export async function check(target?: string): Promise<boolean> {
  let valid = true;
  const workspace = await getWorkspaceInfo(target);
  const modularRoot = getModularRoot();

  /**
   * Validate the the worktree is valid against the globby of package.json files which are found in the
   * current working directory. They should be the same but you never know...
   */

  const workspaceLocations: string[] = (
    await globby(['packages/**/package.json', '!**/node_modules/**'], {
      onlyFiles: true,
      cwd: modularRoot,
    })
  ).map((l) => path.dirname(l));

  Object.entries(workspace).forEach(([packageName, w]) => {
    const workspaceLocation = w.location;
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
      valid = false;
    } else {
      logger.debug(`${packageName} has valid dependencies`);
    }
  });

  return valid;
}
