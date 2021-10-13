import * as fs from 'fs-extra';
import * as path from 'path';

import * as logger from '../utils/logger';
import { ModularPackageJson } from '../utils/isModularType';
import getModularRoot from '../utils/getModularRoot';
import getWorkspaceInfo from '../utils/getWorkspaceInfo';

export default async function verifyPrivateModularRoot(): Promise<boolean> {
  let failed = false;

  const modularRoot = getModularRoot();

  const rootPackageJsonPath = path.join(modularRoot, 'package.json');
  const rootPackageJson = (await fs.readJSON(
    rootPackageJsonPath,
  )) as ModularPackageJson;

  if (rootPackageJson.browserslist) {
    logger.debug(`Modular root has valid browserlist`);
    return false;
  } else {
    const workspace = await getWorkspaceInfo();

    for (const [packageName, worktree] of Object.entries(workspace)) {
      if (worktree.type === 'app') {
        const worktreePackageJson = (await fs.readJson(
          path.join(modularRoot, worktree.location, 'package.json'),
        )) as ModularPackageJson;

        if (worktreePackageJson.browserslist) {
          logger.debug(`${packageName} has valid browserlist`);
        } else {
          logger.error(`${packageName} does not have browserslist set.`);
          failed = true;
        }
      }
    }
  }

  return !failed;
}
