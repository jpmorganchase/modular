import * as path from 'path';
import getModularRoot from './utils/getModularRoot';
import actionPreflightCheck from './utils/actionPreflightCheck';
import isModularType from './utils/isModularType';
import { getWorkspaceInfo } from './utils/getWorkspaceInfo';
import execSync from './utils/execSync';
import stageView from './utils/stageView';

async function start(target: string): Promise<void> {
  const modularRoot = getModularRoot();
  const workspace = await getWorkspaceInfo();
  const record = workspace[target];
  if (!record) {
    throw new Error(`${target} does not exist in modular workspace`);
  }

  const targetPath = path.join(modularRoot, record.location);
  if (isModularType(targetPath, 'package')) {
    throw new Error(
      `The package at ${targetPath} is not a valid modular app or view.`,
    );
  }

  /**
   * If we're trying to start a view then we first need to stage out the
   * view into an 'app' directory which can be built.
   */
  let startPath: string;
  if (isModularType(targetPath, 'view')) {
    startPath = stageView(modularRoot, target);
  } else {
    startPath = targetPath;
  }

  const startScript = require.resolve(
    'modular-scripts/react-scripts/scripts/start.js',
  );
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
