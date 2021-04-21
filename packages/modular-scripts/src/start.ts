import * as path from 'path';
import getModularRoot from './getModularRoot';
import isModularType from './isModularType';
import execSync from './execSync';

import { cracoBin, packagesRoot, cracoConfig } from './config';

export default async function start(appPath: string): Promise<void> {
  const modularRoot = getModularRoot();

  if (!isModularType(path.join(modularRoot, packagesRoot, appPath), 'app')) {
    throw new Error(`The package at ${appPath} is not a valid modular app.`);
  }

  execSync(cracoBin, ['start', '--config', cracoConfig], {
    cwd: path.join(modularRoot, packagesRoot, appPath),
    log: false,
    // @ts-ignore
    env: {
      MODULAR_ROOT: modularRoot,
    },
  });

  return Promise.resolve();
}
