import { paramCase as toParamCase } from 'change-case';

import actionPreflightCheck from './utils/actionPreflightCheck';
import isModularType from './utils/isModularType';
import execAsync from './utils/execAsync';
import getLocation from './utils/getLocation';
import stageView from './utils/stageView';
import getModularRoot from './utils/getModularRoot';
import getWorkspaceInfo from './utils/getWorkspaceInfo';
import { setupEnvForDirectory } from './utils/setupEnv';
import { checkBrowsers } from './utils/checkBrowsers';
import checkRequiredFiles from './utils/checkRequiredFiles';
import createPaths from './utils/createPaths';
import * as logger from './utils/logger';
import createEsbuildBrowserslistTarget from './utils/createEsbuildBrowserslistTarget';
import prompts from 'prompts';
import { getDependencyInfo } from './utils/getDependencyInfo';
import { isReactNewApi } from './utils/isReactNewApi';

async function start(packageName: string): Promise<void> {
  let target = packageName;
  const workspaceInfo = await getWorkspaceInfo();

  if (!target) {
    const availablePackages = Object.keys(workspaceInfo);
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

  let targetPath = await getLocation(target);

  await setupEnvForDirectory(targetPath);

  if (isModularType(targetPath, 'package')) {
    throw new Error(
      `The package at ${targetPath} is not a valid modular app or view.`,
    );
  }

  const isEsmView = isModularType(targetPath, 'esm-view');
  const isView = isModularType(targetPath, 'view');
  if (isView) {
    targetPath = stageView(target);
  } else {
    // in the case we're an app then we need to make sure that users have no incorrectly
    // setup their app folder.
    const paths = await createPaths(target);
    isEsmView
      ? await checkRequiredFiles([paths.appIndexJs])
      : await checkRequiredFiles([paths.appHtml, paths.appIndexJs]);
  }

  await checkBrowsers(targetPath);

  // True if there's no preference set - or the preference is for webpack.
  const useWebpack =
    !process.env.USE_MODULAR_WEBPACK ||
    process.env.USE_MODULAR_WEBPACK === 'true';

  // True if the preference IS set and the preference is esbuild.
  const useEsbuild =
    process.env.USE_MODULAR_ESBUILD &&
    process.env.USE_MODULAR_ESBUILD === 'true';

  // Retrieve dependency info for target to inform the build process
  const {
    importMap,
    styleImports,
    bundledDependencies,
    bundledResolutions,
    externalDependencies,
    externalResolutions,
  } = await getDependencyInfo(target);

  logger.debug(
    `These are the external dependencies and their resolutions: ${JSON.stringify(
      {
        externalDependencies,
        externalResolutions,
      },
    )}`,
  );
  logger.debug(
    `These are the bundled dependencies and their resolutions: ${JSON.stringify(
      {
        bundledDependencies,
        bundledResolutions,
      },
    )}`,
  );

  const useReactCreateRoot = isReactNewApi(externalResolutions);

  // If you want to use webpack then we'll always use webpack. But if you've indicated
  // you want esbuild - then we'll switch you to the new fancy world.
  if (!useWebpack || useEsbuild) {
    const { default: startEsbuildApp } = await import(
      './esbuild-scripts/start'
    );
    await startEsbuildApp({
      target,
      isApp: !isEsmView,
      importMap,
      useReactCreateRoot,
      styleImports,
    });
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
        MODULAR_IS_APP: JSON.stringify(!isEsmView),
        MODULAR_IMPORT_MAP: JSON.stringify(Object.fromEntries(importMap || [])),
        MODULAR_USE_REACT_CREATE_ROOT: JSON.stringify(useReactCreateRoot),
        MODULAR_STYLE_IMPORT_MAPS: JSON.stringify([...styleImports]),
      },
    });
  }
}

export default actionPreflightCheck(start);
