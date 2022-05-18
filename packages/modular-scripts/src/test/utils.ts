import _rimraf from 'rimraf';
import execa from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';

import getModularRoot from '../utils/getModularRoot';

const rimraf = promisify(_rimraf);

const modularRoot = getModularRoot();

export function modular(
  str: string,
  opts: Record<string, unknown> = {},
): execa.ExecaChildProcess<string> {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd: modularRoot,
    cleanup: true,
    ...opts,
  });
}

export async function cleanup(packageNames: Array<string>): Promise<void> {
  const packagesPath = path.join(modularRoot, 'packages');
  const distPath = path.join(modularRoot, 'dist');

  for (const packageName of packageNames) {
    await rimraf(path.join(packagesPath, packageName));
    await rimraf(path.join(distPath, packageName));
  }

  // run yarn so yarn.lock gets reset
  await execa('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

export async function addFixturePackage(
  name: string,
  options: { copy: boolean } = { copy: true },
): Promise<void> {
  const packageSrcDir = path.join(modularRoot, 'packages', name, 'src');
  await modular(`add ${name} --unstable-type package`, {
    stdio: 'inherit',
  });
  await fs.emptyDir(packageSrcDir);

  if (options.copy) {
    await fs.copy(
      path.join(__dirname, '..', '__tests__', '__fixtures__', 'packages', name),
      packageSrcDir,
    );
  }
}
