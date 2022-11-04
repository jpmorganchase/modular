import * as path from 'path';
import * as fs from 'fs-extra';
import { ModularPackageJson } from '@modular-scripts/modular-types';

import execAsync from '../../utils/execAsync';
import getModularRoot from '../../utils/getModularRoot';

async function getRelativePathInRepo(packagePath: string) {
  const { stdout: gitRepoPath } = await execAsync(
    'git',
    ['rev-parse', '--show-toplevel'],
    { stdout: 'pipe' },
  );
  return path.relative(gitRepoPath, packagePath);
}

export async function getRepositoryField(packagePath: string) {
  const modularRoot = getModularRoot();
  const pathInRepo = await getRelativePathInRepo(packagePath);
  const rootPackageJsonPath = path.join(modularRoot, 'package.json');
  const rootPackageJson = (await fs.readJSON(
    rootPackageJsonPath,
  )) as ModularPackageJson;

  if (rootPackageJson.repository && pathInRepo) {
    return {
      type: 'git',
      url: rootPackageJson.repository,
      directory: pathInRepo,
    };
  }

  return undefined;
}
