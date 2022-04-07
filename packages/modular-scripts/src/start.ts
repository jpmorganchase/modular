import { paramCase as toParamCase } from 'change-case';

import actionPreflightCheck from './utils/actionPreflightCheck';
import isModularType from './utils/isModularType';
import execAsync from './utils/execAsync';
import getLocation from './utils/getLocation';
import getModularRoot from './utils/getModularRoot';
import getWorkspaceInfo from './utils/getWorkspaceInfo';
import { setupEnvForDirectory } from './utils/setupEnv';
import { checkBrowsers } from './utils/checkBrowsers';
import checkRequiredFiles from './utils/checkRequiredFiles';
import createPaths from './utils/createPaths';
import * as logger from './utils/logger';
import createEsbuildBrowserslistTarget from './utils/createEsbuildBrowserslistTarget';
import prompts from 'prompts';
import { getPackageDependencies } from './utils/getPackageDependencies';
import { filterDependencies } from './utils/filterDependencies';

async function start(packageName: string): Promise<void> {
  let target = packageName;

  if (!target) {
    const availablePackages = Object.keys(await getWorkspaceInfo());
    const chosenTarget = await prompts<string>({
      type: 'select',
      name: 'value',
      message: 'Select a package to start',
      choices: availablePackages.map((packageName) => ({
        title: packageName,
        value: packageName,
      })),
      initial: 0,
    });
    target = chosenTarget.value as string;
  }

  const targetPath = await getLocation(target);

  await setupEnvForDirectory(targetPath);

  if (isModularType(targetPath, 'package')) {
    throw new Error(
      `The package at ${targetPath} is not a valid modular app or view.`,
    );
  }

  const isView = isModularType(targetPath, 'view');

  const paths = await createPaths(target);
  isView
    ? await checkRequiredFiles([paths.appIndexJs])
    : await checkRequiredFiles([paths.appHtml, paths.appIndexJs]);

  await checkBrowsers(targetPath);

  // True if there's no preference set - or the preference is for webpack.
  const useWebpack =
    !process.env.USE_MODULAR_WEBPACK ||
    process.env.USE_MODULAR_WEBPACK === 'true';

  // True if the preferene IS set and the preference is esbuid.
  const useEsbuild =
    process.env.USE_MODULAR_ESBUILD &&
    process.env.USE_MODULAR_ESBUILD === 'true';

  const packageDependencies = await getPackageDependencies(target);
  const { external: externalDependencies, bundled: bundledDependencies } =
    filterDependencies(packageDependencies, !isView);

  // If you want to use webpack then we'll always use webpack. But if you've indicated
  // you want esbuild - then we'll switch you to the new fancy world.
  if (!useWebpack || useEsbuild) {
    const { default: startEsbuildApp } = await import(
      './esbuild-scripts/start'
    );
    await startEsbuildApp(target, !isView, externalDependencies);
  } else {
    const startScript = require.resolve(
      'modular-scripts/react-scripts/scripts/start.js',
    );
    const modularRoot = getModularRoot();
    const targetName = toParamCase(target);

    const browserTarget = createEsbuildBrowserslistTarget(targetPath);

    logger.debug(`Using target: ${browserTarget.join(', ')}`);

    await execAsync('node', [startScript], {
      cwd: targetPath,
      log: false,
      // @ts-ignore
      env: {
        ESBUILD_TARGET_FACTORY: JSON.stringify(browserTarget),
        MODULAR_ROOT: modularRoot,
        MODULAR_PACKAGE: target,
        MODULAR_PACKAGE_NAME: targetName,
        MODULAR_IS_APP: JSON.stringify(!isView),
        MODULAR_PACKAGE_DEPS: JSON.stringify({
          externalDependencies,
          bundledDependencies,
        }),
      },
    });
  }
}

export default actionPreflightCheck(start);
