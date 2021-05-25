import * as path from 'path';
import resolveAsBin from 'resolve-as-bin';
import getModularRoot from '../utils/getModularRoot';
import isModularType from '../utils/isModularType';
import execSync from '../utils/execSync';

import { packagesRoot, cracoConfig } from '../config';

export default async function start(appPath: string): Promise<void> {
  const modularRoot = getModularRoot();

  if (!isModularType(path.join(modularRoot, packagesRoot, appPath), 'app')) {
    throw new Error(`The package at ${appPath} is not a valid modular app.`);
  }
  const cracoBin = resolveAsBin('craco');

  execSync(cracoBin, ['start', '--config', cracoConfig], {
    cwd: path.join(modularRoot, packagesRoot, appPath),
    log: false,
    // @ts-ignore
    env: {
      USE_MODULAR_BABEL: process.env.USE_MODULAR_BABEL,
      MODULAR_ROOT: modularRoot,
    },
  });

  return Promise.resolve();
}
