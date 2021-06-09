import * as path from 'path';
import getModularRoot from './utils/getModularRoot';
import isModularType from './utils/isModularType';
import startApp from './startApp.js';

import { packagesRoot } from './config';

export default function start(appPath: string): Promise<void> {
  const modularRoot = getModularRoot();

  if (!isModularType(path.join(modularRoot, packagesRoot, appPath), 'app')) {
    throw new Error(`The package at ${appPath} is not a valid modular app.`);
  }

  return startApp(
    path.join(modularRoot, packagesRoot, appPath),
  ) as Promise<void>;
}
