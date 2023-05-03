import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import * as logger from '../utils/logger';
import getWorkspaceLocation from '../utils/getLocation';
import determineTargetPaths from './common-scripts/determineTargetPaths';
import printHostingInstructions from './printHostingInstructions';
import { Asset, printFileSizesAfterBuild } from './fileSizeReporter';
import { checkBrowsers } from '../utils/checkBrowsers';
import checkRequiredFiles from '../utils/checkRequiredFiles';
import createEsbuildBrowserslistTarget from './common-scripts/createEsbuildBrowserslistTarget';
import { getEntryPoint, writeOutputIndexFiles } from './esbuild-scripts/api';
import {
  createWebpackAssets,
  webpackMeasureFileSizesBeforeBuild,
} from './webpackFileSizeReporter';
import {
  createEsbuildAssets,
  esbuildMeasureFileSizesBeforeBuild,
} from './esbuildFileSizeReporter';
import { getDependencyInfo } from '../utils/getDependencyInfo';
import { isReactNewApi } from '../utils/isReactNewApi';
import { getConfig } from '../utils/config';
import buildWebpack from './webpack-scripts/buildWebpack';
import getModularRoot from '../utils/getModularRoot';
import type {
  ModularPackageJson,
  ModularType,
} from '@modular-scripts/modular-types';

export async function buildStandalone(
  target: string,
  type: Extract<ModularType, 'app' | 'esm-view'>,
) {
  // Setup Paths
  const targetDirectory = await getWorkspaceLocation(target);

  const paths = determineTargetPaths(target, targetDirectory);
  const isApp = type === 'app';

  const isEsbuild = getConfig('useModularEsbuild', targetDirectory);

  await checkBrowsers(targetDirectory);

  let previousFileSizes: Record<string, number>;
  if (isEsbuild) {
    previousFileSizes = await esbuildMeasureFileSizesBeforeBuild(
      paths.appBuild,
    );
  } else {
    previousFileSizes = await webpackMeasureFileSizesBeforeBuild(
      paths.appBuild,
    );
  }

  // Warn and crash if required files are missing
  isApp
    ? await checkRequiredFiles([paths.appHtml, paths.appIndexJs])
    : await checkRequiredFiles([paths.appIndexJs]);

  logger.log('Creating an optimized production build...');

  // Copy assets from public/ to dist/, execept for index.html
  await fs.emptyDir(paths.appBuild);
  if (await fs.pathExists(paths.appPublic)) {
    await fs.copy(paths.appPublic, paths.appBuild, {
      dereference: true,
      filter: (file) => file !== paths.appHtml,
      overwrite: true,
    });
  }

  let assets: Asset[];
  logger.debug('Extracting dependency info from source code...');

  // Retrieve dependency info for target to inform the build process
  const {
    importInfo,
    styleImports,
    packageDependencies,
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

  // If it's an app, set it at ESBUILD_TARGET_FACTORY or default to es2015
  // If it's not an app it's an ESM view, then we need es2020
  const browserTarget = createEsbuildBrowserslistTarget(targetDirectory);
  const esbuildTargetFactory = isApp ? browserTarget : ['es2020'];

  let jsEntryPoint: string | undefined;
  let cssEntryPoint: string | undefined;

  if (isEsbuild) {
    logger.debug('Building with esbuild');
    const { default: buildEsbuildApp } = await import(
      './esbuild-scripts/build'
    );
    const result = await buildEsbuildApp(target, paths, importInfo, type);
    jsEntryPoint = getEntryPoint(paths, result, '.js');
    cssEntryPoint = getEntryPoint(paths, result, '.css');
    assets = createEsbuildAssets(result);
  } else {
    logger.debug('Building with Webpack');
    // create-react-app doesn't support plain module outputs yet,
    // so --preserve-modules has no effect here

    const stats = await buildWebpack(
      esbuildTargetFactory,
      isApp,
      importInfo,
      useReactCreateRoot,
      styleImports,
      paths,
    );

    const mainEntrypoint = stats.assetsByChunkName?.main;
    jsEntryPoint = mainEntrypoint?.find((entryPoint: string) =>
      entryPoint.endsWith('.js'),
    );
    cssEntryPoint = mainEntrypoint?.find((entryPoint: string) =>
      entryPoint.endsWith('.css'),
    );

    if (stats.warnings?.length) {
      logger.log(chalk.yellow('Compiled with warnings.\n'));
      logger.log(stats.warnings.join('\n\n'));
      logger.log(
        '\nSearch for the ' +
          chalk.underline(chalk.yellow('keywords')) +
          ' to learn more about each warning.',
      );
    } else {
      logger.log(chalk.green('Compiled successfully.\n'));
    }
    assets = createWebpackAssets(paths, stats);
  }

  if (!jsEntryPoint) {
    throw new Error("Can't find main entrypoint after building");
  }

  // Only Webpack apps create their index files separately with a plugin - exclude them
  if (!isApp || isEsbuild) {
    await writeOutputIndexFiles({
      paths,
      cssEntryPoint,
      jsEntryPoint,
      styleImports,
      importInfo,
      modularType: type,
      externalResolutions,
    });
  }

  // Add dependencies from source and bundled dependencies to target package.json
  const targetPackageJson = (await fs.readJSON(
    path.join(targetDirectory, 'package.json'),
  )) as ModularPackageJson;

  const rootPackageJson = (await fs.readJSON(
    path.join(getModularRoot(), 'package.json'),
  )) as ModularPackageJson;

  // Copy selected fields of package.json over
  await fs.writeJson(
    path.join(paths.appBuild, 'package.json'),
    {
      name: targetPackageJson.name,
      version: targetPackageJson.version,
      license: targetPackageJson.license,
      modular: targetPackageJson.modular,
      dependencies: packageDependencies,
      bundledDependencies: isApp
        ? Object.keys(packageDependencies)
        : Object.keys(bundledResolutions),
      module: jsEntryPoint ? paths.publicUrlOrPath + jsEntryPoint : undefined,
      style: cssEntryPoint ? paths.publicUrlOrPath + cssEntryPoint : undefined,
      styleImports: styleImports?.size ? [...styleImports] : undefined,
      engines: targetPackageJson.engines ?? rootPackageJson.engines,
    },
    { spaces: 2 },
  );

  printFileSizesAfterBuild(assets, previousFileSizes);

  printHostingInstructions(
    target,
    paths.publicUrlOrPath,
    paths.publicUrlOrPath,
    paths.appBuild,
  );
}
