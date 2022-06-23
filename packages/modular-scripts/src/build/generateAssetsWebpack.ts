import * as fs from 'fs-extra';
import chalk from 'chalk';
import path from 'path';
import { StatsCompilation } from 'webpack';
import execAsync from '../utils/execAsync';
import * as logger from '../utils/logger';
import { createWebpackAssets } from './webpackFileSizeReporter';
import { StandAloneBuilderContext } from './createBuilderContext';

export async function generateAssetsWebpack(context: StandAloneBuilderContext) {
  const {
    paths,
    dependencies,
    type,
    targetDirectory,
    browserTarget,
    modularRoot,
    targetName,
  } = context;

  if (!dependencies) {
    throw new Error(
      `generateWebpackAssets: cannot run without a dependencies map`,
    );
  }

  const isApp = type === 'app';
  const buildScript = require.resolve(
    'modular-scripts/react-scripts/scripts/build.js',
  );

  await execAsync('node', [buildScript], {
    cwd: targetDirectory,
    log: false,
    // @ts-ignore
    env: {
      ESBUILD_TARGET_FACTORY: JSON.stringify(browserTarget),
      MODULAR_ROOT: modularRoot,
      MODULAR_PACKAGE: targetDirectory,
      MODULAR_PACKAGE_NAME: targetName,
      MODULAR_IS_APP: JSON.stringify(isApp),
      MODULAR_PACKAGE_DEPS: JSON.stringify({
        externalDependencies: dependencies.externalDependencies,
        bundledDependencies: dependencies.bundledDependencies,
      }),
      MODULAR_PACKAGE_RESOLUTIONS: JSON.stringify({
        externalResolutions: dependencies.externalResolutions,
        bundledResolutions: dependencies.bundledResolutions,
      }),
    },
  });

  const statsFilePath = path.join(paths.appBuild, 'bundle-stats.json');

  try {
    const stats: StatsCompilation = await fs.readJson(statsFilePath);

    const mainEntrypoint = stats?.assetsByChunkName?.main;
    context.jsEntryPoint = mainEntrypoint?.find((entryPoint) =>
      entryPoint.endsWith('.js'),
    );
    context.cssEntryPoint = mainEntrypoint?.find((entryPoint) =>
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
    context.assets.push(...createWebpackAssets(paths, stats));
  } finally {
    await fs.remove(statsFilePath);
  }
}
