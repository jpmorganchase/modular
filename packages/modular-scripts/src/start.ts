import prompts from 'prompts';
import actionPreflightCheck from './utils/actionPreflightCheck';
import {
  getModularType,
  isModularType,
  isStartableModularType,
} from './utils/packageTypes';
import getWorkspaceLocation from './utils/getLocation';
import stageView from './utils/stageView';
import getWorkspaceInfo from './utils/getWorkspaceInfo';
import { setupEnvForDirectory } from './utils/setupEnv';
import { checkBrowsers } from './utils/checkBrowsers';
import checkRequiredFiles from './utils/checkRequiredFiles';
import * as logger from './utils/logger';
import createEsbuildBrowserslistTarget from './build-scripts/common-scripts/createEsbuildBrowserslistTarget';
import { getDependencyInfo } from './utils/getDependencyInfo';
import { isReactNewApi } from './utils/isReactNewApi';
import { getConfig } from './utils/config';
import determineTargetPaths from './build-scripts/common-scripts/determineTargetPaths';
import startWebpack from './build-scripts/webpack-scripts/startWebpack';
import startEsbuild from './build-scripts/esbuild-scripts/start';
import type { PackageType } from '@modular-scripts/modular-types';

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

  let targetPath = await getWorkspaceLocation(target);

  await setupEnvForDirectory(targetPath);

  const modularType = getModularType(targetPath);
  if (!modularType || !isStartableModularType(modularType as PackageType)) {
    throw new Error(
      `The package at ${targetPath} can't be started because ${
        modularType
          ? `has Modular type "${modularType}"`
          : `has no Modular type`
      }.`,
    );
  }

  const isEsmView = isModularType(targetPath, 'esm-view');
  const isView = isModularType(targetPath, 'view');
  if (isView) targetPath = stageView(target);

  const paths = determineTargetPaths(target, targetPath);
  // in the case we're an app then we need to make sure that users have no incorrectly
  // setup their app folder.
  isEsmView
    ? await checkRequiredFiles([paths.appIndexJs])
    : await checkRequiredFiles([paths.appHtml, paths.appIndexJs]);

  await checkBrowsers(targetPath);

  // Retrieve dependency info for target to inform the build process
  const {
    importInfo,
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
  if (getConfig('useModularEsbuild', targetPath)) {
    await startEsbuild({
      target,
      isApp: !isEsmView,
      importInfo,
      useReactCreateRoot,
      styleImports,
    });
  } else {
    const browserTarget = createEsbuildBrowserslistTarget(targetPath);

    // If it's an app, set it at ESBUILD_TARGET_FACTORY or default to es2015
    // If it's not an app it's an ESM view, then we need es2020
    const esbuildTargetFactory = !isEsmView ? browserTarget : ['es2020'];

    logger.debug(`Using target: ${browserTarget.join(', ')}`);
    startWebpack(
      esbuildTargetFactory,
      !isEsmView,
      importInfo,
      useReactCreateRoot,
      styleImports,
      paths,
    );
  }
}

export default actionPreflightCheck(start);
