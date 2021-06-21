import * as path from 'path';
import resolveAsBin from 'resolve-as-bin';
import getModularRoot from './utils/getModularRoot';
import isModularType from './utils/isModularType';
import execSync from './utils/execSync';
import stageView from './utils/stageView';
import { packagesRoot, cracoConfig } from './config';

export default function start(target: string): Promise<void> {
  const modularRoot = getModularRoot();
  const targetPath = path.join(modularRoot, packagesRoot, target);
  if (isModularType(targetPath, 'package')) {
    throw new Error(
      `The package at ${targetPath} is not a valid modular app or view.`,
    );
  }
  const cracoBin = resolveAsBin('craco');

  if (isModularType(targetPath, 'view')) {
    stageView(modularRoot, target);
    execSync(cracoBin, ['start', '--config', cracoConfig], {
      cwd: path.join(__dirname, 'temp', target),
      log: false,
      // @ts-ignore
      env: {
        USE_MODULAR_BABEL: process.env.USE_MODULAR_BABEL,
        MODULAR_ROOT: modularRoot,
      },
    });
    return Promise.resolve();
  }
  execSync(cracoBin, ['start', '--config', cracoConfig], {
    cwd: path.join(modularRoot, packagesRoot, target),
    log: false,
    // @ts-ignore
    env: {
      USE_MODULAR_BABEL: process.env.USE_MODULAR_BABEL,
      MODULAR_ROOT: modularRoot,
    },
  });
  return Promise.resolve();
}
