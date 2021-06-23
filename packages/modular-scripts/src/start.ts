import * as path from 'path';
import { resolveAsBin } from './utils/resolve-as-bin';
import getModularRoot from './utils/getModularRoot';
import isModularType from './utils/isModularType';
import execSync from './utils/execSync';
import stageView from './utils/stageView';
import { packagesRoot, cracoConfig } from './config';

export default async function start(target: string): Promise<void> {
  const modularRoot = getModularRoot();
  const targetPath = path.join(modularRoot, packagesRoot, target);
  if (isModularType(targetPath, 'package')) {
    throw new Error(
      `The package at ${targetPath} is not a valid modular app or view.`,
    );
  }

  const cracoBin = await resolveAsBin('@craco/craco');
  let startPath = path.join(modularRoot, packagesRoot, target);
  if (isModularType(targetPath, 'view')) {
    const stagedView = stageView(modularRoot, target);
    startPath = stagedView;
  }
  execSync(cracoBin, ['start', '--config', cracoConfig], {
    cwd: startPath,
    log: false,
    // @ts-ignore
    env: {
      USE_MODULAR_BABEL: process.env.USE_MODULAR_BABEL,
      MODULAR_ROOT: modularRoot,
    },
  });
  return Promise.resolve();
}
