import { paramCase as toParamCase } from 'change-case';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import type { CoreProperties } from '@schemastore/package';
import type { ModularType } from '@modular-scripts/modular-types';

import * as logger from '../utils/logger';
import getModularRoot from '../utils/getModularRoot';
import execAsync from '../utils/execAsync';
import getWorkspaceLocation from '../utils/getLocation';
import createPaths from '../utils/createPaths';
import printHostingInstructions from './printHostingInstructions';
import { Asset, printFileSizesAfterBuild } from './fileSizeReporter';
import type { StatsCompilation } from 'webpack';
import { checkBrowsers } from '../utils/checkBrowsers';
import checkRequiredFiles from '../utils/checkRequiredFiles';
import createEsbuildBrowserslistTarget from '../utils/createEsbuildBrowserslistTarget';
import { writeOutputIndexFiles, getEntryPoint } from '../esbuild-scripts/api';
import {
  webpackMeasureFileSizesBeforeBuild,
  createWebpackAssets,
} from './webpackFileSizeReporter';
import {
  createEsbuildAssets,
  esbuildMeasureFileSizesBeforeBuild,
} from './esbuildFileSizeReporter';
import { getDependencyInfo } from '../utils/getDependencyInfo';
import { isReactNewApi } from '../utils/isReactNewApi';
import { getConfig } from '../utils/config';

export async function buildStandalone(
  target: string,
  type: Extract<ModularType, 'app' | 'esm-view'>,
) {
  // Setup Paths
  const modularRoot = getModularRoot();
  const targetDirectory = await getWorkspaceLocation(target);
  const targetName = toParamCase(target);

  const paths = await createPaths(target);
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

  await fs.emptyDir(paths.appBuild);
  await fs.copy(paths.appPublic, paths.appBuild, {
    dereference: true,
    filter: (file) => file !== paths.appHtml,
    overwrite: true,
  });

  let assets: Asset[];
  logger.debug('Extracting dependency info from source code...');

  // Retrieve dependency info for target to inform the build process
  const {
    importMap,
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
  const browserTarget = createEsbuildBrowserslistTarget(targetDirectory);

  let jsEntryPoint: string | undefined;
  let cssEntryPoint: string | undefined;

  if (isEsbuild) {
    logger.debug('Building with esbuild');
    const { default: buildEsbuildApp } = await import(
      '../esbuild-scripts/build'
    );
    const result = await buildEsbuildApp(target, paths, importMap, type);
    jsEntryPoint = getEntryPoint(paths, result, '.js');
    cssEntryPoint = getEntryPoint(paths, result, '.css');
    assets = createEsbuildAssets(paths, result);
  } else {
    logger.debug('Building with Webpack');
    // create-react-app doesn't support plain module outputs yet,
    // so --preserve-modules has no effect here

    const buildScript = require.resolve(
      'modular-scripts/react-scripts/scripts/build.js',
    );

    // TODO: this shouldn't be sync
    await execAsync('node', [buildScript], {
      cwd: targetDirectory,
      log: false,
      // @ts-ignore
      env: {
        ESBUILD_TARGET_FACTORY: JSON.stringify(browserTarget),
        MODULAR_ROOT: modularRoot,
        MODULAR_PACKAGE: target,
        MODULAR_PACKAGE_NAME: targetName,
        MODULAR_IS_APP: JSON.stringify(isApp),
        MODULAR_IMPORT_MAP: JSON.stringify(Object.fromEntries(importMap || [])),
        MODULAR_USE_REACT_CREATE_ROOT: JSON.stringify(useReactCreateRoot),
        INTERNAL_PUBLIC_URL: getConfig('publicUrl', targetDirectory),
        INTERNAL_GENERATE_SOURCEMAP: String(
          getConfig('generateSourceMap', targetDirectory),
        ),
      },
    });

    const statsFilePath = path.join(paths.appBuild, 'bundle-stats.json');

    try {
      const stats: StatsCompilation = await fs.readJson(statsFilePath);

      const mainEntrypoint = stats?.assetsByChunkName?.main;
      jsEntryPoint = mainEntrypoint?.find((entryPoint) =>
        entryPoint.endsWith('.js'),
      );
      cssEntryPoint = mainEntrypoint?.find((entryPoint) =>
        entryPoint.endsWith('.css'),
      );

      if (stats?.warnings?.length) {
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
    } finally {
      await fs.remove(statsFilePath);
    }
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
      importMap,
      modularType: type,
      externalResolutions,
    });
  }

  // Add dependencies from source and bundled dependencies to target package.json
  const targetPackageJson = (await fs.readJSON(
    path.join(targetDirectory, 'package.json'),
  )) as CoreProperties;
  // Copy selected fields of package.json over
  fs.writeJSON(
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
