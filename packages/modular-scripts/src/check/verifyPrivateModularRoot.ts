import * as fs from 'fs-extra';
import * as path from 'path';

import * as logger from '../utils/logger';
import { ModularPackageJson } from '../utils/isModularType';
import getModularRoot from '../utils/getModularRoot';

export default async function verifyPrivateModularRoot(): Promise<boolean> {
  const modularRoot = getModularRoot();

  const rootPackageJsonPath = path.join(modularRoot, 'package.json');
  const rootPackageJson = (await fs.readJSON(
    rootPackageJsonPath,
  )) as ModularPackageJson;
  if (!rootPackageJson.private) {
    logger.error(`Modular workspace roots must be marked as private`);
    return false;
  }

  if (!rootPackageJson?.workspaces?.includes('packages/**')) {
    logger.error(
      `Modular workspaces must include "packages/**" to pick up any modular packages in the worktree`,
    );
    return false;
  }

  logger.debug('Modular root is valid.');

  return true;
}
