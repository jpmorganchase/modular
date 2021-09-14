import { paramCase as toParamCase } from 'change-case';

import actionPreflightCheck from './utils/actionPreflightCheck';
import isModularType from './utils/isModularType';
import execAsync from './utils/execAsync';
import getLocation from './utils/getLocation';
import stageView from './utils/stageView';
import getModularRoot from './utils/getModularRoot';
import { setupEnvForDirectory } from './utils/setupEnv';
import { checkBrowsers } from './utils/checkBrowsers';
import checkRequiredFiles from './utils/checkRequiredFiles';
import createPaths from './utils/createPaths';

async function start(target: string): Promise<void> {
  const targetPath = await getLocation(target);

  await setupEnvForDirectory(targetPath);

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

    // in the case we're an app then we need to make sure that users have no incorrectly
    // setup their app folder.
    const paths = await createPaths(target);
    await checkRequiredFiles([paths.appHtml, paths.appIndexJs]);
  }

  await checkBrowsers(startPath);

  if (process.env.USE_MODULAR_ESBUILD) {
    const { default: startEsbuildApp } = await import(
      './esbuild-scripts/start'
    );
    await startEsbuildApp(target);
  } else {
    const startScript = require.resolve(
      'modular-scripts/react-scripts/scripts/start.js',
    );
    const modularRoot = getModularRoot();
    const targetName = toParamCase(target);

    await execAsync('node', [startScript], {
      cwd: startPath,
      log: false,
      // @ts-ignore
      env: {
        MODULAR_ROOT: modularRoot,
        MODULAR_PACKAGE: target,
        MODULAR_PACKAGE_NAME: targetName,
      },
    });
  }

  return Promise.resolve();
}

export default actionPreflightCheck(start);
