import { symlinkSync } from 'fs';
import { join } from 'path';
import { copy, readJsonSync } from 'fs-extra';
import { simpleGit } from 'simple-git';

import type { ModularType } from '@modular-scripts/modular-types';
import type { Paths } from 'modular-scripts/src/utils/createPaths';

import { mkdtemp } from './io';
import { ModularBuildConfig } from '../types';

export async function createTestContext(fixture: string): Promise<string> {
  const dir = await mkdtemp();
  const repo = await simpleGit().revparse('--show-toplevel');

  debugger;
  await copy(join(repo, '__fixtures__', fixture), dir);
  symlinkSync(join(repo, 'node_modules'), join(dir, 'node_modules'));
  debugger;

  return dir;
}

export function createModularBuildConfig(
  modularRoot: string,
  pkg: string,
): ModularBuildConfig {
  const targetDirectory = `${modularRoot}/packages/${pkg}`;
  const {
    name: targetName,
    modular: { type },
  } = readJsonSync(`${targetDirectory}/package.json`) as Record<string, any>;

  return {
    type: type as ModularType,
    modularRoot,
    targetDirectory,
    targetName: targetName as string,
    targetPaths: {} as unknown as Paths,
  };
}
