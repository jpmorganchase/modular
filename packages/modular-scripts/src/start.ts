import actionPreflightCheck from './utils/actionPreflightCheck';
import isModularType from './utils/isModularType';
import execSync from './utils/execSync';
import getLocation from './utils/getLocation';
import stageView from './utils/stageView';
import getModularRoot from './utils/getModularRoot';

async function start(target: string): Promise<void> {
  const targetPath = await getLocation(target);
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
    startPath = stageView(target);
  } else {
    startPath = targetPath;
  }

  const startScript = require.resolve(
    'modular-scripts/react-scripts/scripts/start.js',
  );
  const modularRoot = getModularRoot();

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
