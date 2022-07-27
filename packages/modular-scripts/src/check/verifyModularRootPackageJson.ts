import * as path from 'path';

import * as fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';
import { ModularPackageJson } from '../utils/isModularType';
import * as logger from '../utils/logger';

/**
 * @param rootPackageJson package.json object from the modular root
 * @returns Returns true if the packages directory is correctly included in `workspaces`, else false
 */
function checkWorkspaceHasPackages(rootPackageJson: ModularPackageJson) {
  // Allow modular itself to have any value
  if (rootPackageJson.name === 'modular') {
    return true;
  }

  if (Array.isArray(rootPackageJson?.workspaces)) {
    return !!rootPackageJson.workspaces.includes('packages/**');
  }

  return !!rootPackageJson?.workspaces?.packages?.includes('packages/**');
}

export async function check(): Promise<boolean> {
  const modularRoot = getModularRoot(); // Implicitly checks whether modular.type === 'root'
  const rootPackageJsonPath = path.join(modularRoot, 'package.json');
  const rootPackageJson = (await fs.readJSON(
    rootPackageJsonPath,
  )) as ModularPackageJson;

  if (!rootPackageJson.private) {
    logger.error(`Modular workspace roots must be marked as private`);
    return false;
  }

  if (!checkWorkspaceHasPackages(rootPackageJson)) {
    logger.error(
      `Modular workspaces must include "packages/**" to pick up any modular packages in the worktree`,
    );
    return false;
  }

  logger.debug('Modular root is valid.');

  return true;
}

export function isValidModularRootPackageJson(dir: string): boolean {
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath) as ModularPackageJson;
    return (
      packageJson.modular?.type === 'root' &&
      !!packageJson.private &&
      checkWorkspaceHasPackages(packageJson)
    );
  }
  return false;
}
