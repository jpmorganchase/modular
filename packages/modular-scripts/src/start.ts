import * as path from 'path';
import getModularRoot from './utils/getModularRoot';
import actionPreflightCheck from './utils/actionPreflightCheck';
import isModularType from './utils/isModularType';
import execSync from './utils/execSync';
import stageView from './utils/stageView';
import { packagesRoot } from './config';

async function start(target: string): Promise<void> {
  const modularRoot = getModularRoot();
  const targetPath = path.join(modularRoot, packagesRoot, target);
  if (isModularType(targetPath, 'package')) {
    throw new Error(
      `The package at ${targetPath} is not a valid modular app or view.`,
    );
  }

  const startScript = require.resolve(
    'modular-scripts/react-scripts/scripts/start.js',
  );
  let startPath = path.join(modularRoot, packagesRoot, target);
  if (isModularType(targetPath, 'view')) {
    const stagedView = stageView(modularRoot, target);
    startPath = stagedView;
  }
  execSync('node', [startScript], {
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

export default actionPreflightCheck(start);
