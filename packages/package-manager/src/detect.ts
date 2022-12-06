import { readJson } from 'fs-extra';
import { join } from 'path';

import { exists, FILE, FOLDER } from '@kwsites/file-exists';

import { Npm } from './npm';
import { PackageManager, Yarn1 } from './yarn1';
import { Yarn3 } from './yarn3';

const packageManagers = {
  yarn1: Yarn1,
  yarn3: Yarn3,
  npm: Npm,
};

export type PackageManagerIdentifier = keyof typeof packageManagers;
type Maybe<T> = T | null;

async function detectExplicitPackageManager(
  root: string,
): Promise<Maybe<PackageManagerIdentifier>> {
  const path = join(root, 'package.json');
  if (!exists(path, FILE)) {
    return null;
  }

  const { packageManager = '' } = (await readJson(
    join(root, 'package.json'),
  )) as { packageManager?: string };
  const [type, version = ''] = packageManager.split('@');

  switch (type) {
    case 'yarn':
      if (version.startsWith('1.')) {
        return 'yarn1';
      }
      if (version.startsWith('3.')) {
        return 'yarn3';
      }
      return null;
    default:
      return null;
  }
}

function detectYarn(root: string): Maybe<PackageManagerIdentifier> {
  if (!exists(join(root, 'yarn.lock'), FILE)) {
    return null;
  }

  return exists(join(root, '.yarn'), FOLDER) ? 'yarn3' : 'yarn1';
}

function detectNpm(root: string): Maybe<PackageManagerIdentifier> {
  if (!exists(join(root, 'package-lock.json'), FILE)) {
    return null;
  }

  return 'npm';
}

export async function detect(
  root = process.cwd(),
): Promise<PackageManagerIdentifier> {
  const packageManager: Maybe<PackageManagerIdentifier> =
    (await detectExplicitPackageManager(root)) ||
    detectYarn(root) ||
    detectNpm(root);
  if (!packageManager) {
    throw new Error(`Unable to detect a supported package manager`);
  }

  return packageManager;
}

export function packageManager(type: PackageManagerIdentifier): PackageManager {
  return new packageManagers[type]();
}
