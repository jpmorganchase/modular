import { paramCase as toParamCase } from 'change-case';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';

import * as logger from '../utils/logger';
import getModularRoot from '../utils/getModularRoot';
import actionPreflightCheck from '../utils/actionPreflightCheck';
import isModularType from '../utils/isModularType';
import execSync from '../utils/execSync';
import getLocation from '../utils/getLocation';
import { setupEnvForDirectory } from '../utils/setupEnv';
import createPaths from '../utils/createPaths';
import printHostingInstructions from './printHostingInstructions';
import { measureFileSizesBeforeBuild, printFileSizesAfterBuild } from './fileSizeReporter';
import type { Stats } from 'webpack';

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024;
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024;

async function buildApp(target: string) {
  const modularRoot = getModularRoot();
  const targetDirectory = await getLocation(target);
  const targetName = toParamCase(target);
  
  const paths = await createPaths(target);

  const previousFileSizes = await measureFileSizesBeforeBuild(paths.appBuild);

  logger.log("Creating an optimized production build...");

  if (process.env.USE_MODULAR_ESBUILD) {
    const { default: buildEsbuildApp } = await import("../esbuild-scripts/build");
    await buildEsbuildApp(target, paths);
  } else {
    // create-react-app doesn't support plain module outputs yet,
    // so --preserve-modules has no effect here

    const buildScript = require.resolve(
      'modular-scripts/react-scripts/scripts/build.js',
    );

    // TODO: this shouldn't be sync
    execSync('node', [buildScript], {
      cwd: targetDirectory,
      log: false,
      // @ts-ignore
      env: {
        MODULAR_ROOT: modularRoot,
        MODULAR_PACKAGE: target,
        MODULAR_PACKAGE_NAME: targetName,
      },
    });

    const statsFilePath = path.join(paths.appBuild, 'bundle-stats.json');
    
    try {
      const stats: Stats.ToJsonOutput = await fs.readJson(statsFilePath);
  
      if (stats.warnings.length) {
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

      logger.log('File sizes after gzip:\n');
      printFileSizesAfterBuild(
        stats,
        previousFileSizes,
        paths.appBuild,
        WARN_AFTER_BUNDLE_GZIP_SIZE,
        WARN_AFTER_CHUNK_GZIP_SIZE,
      );
      logger.log();
    } finally {
      await fs.remove(statsFilePath)
    }
  }


  printHostingInstructions(
    fs.readJSON(paths.appPackageJson),
    paths.publicUrlOrPath,
    paths.publicUrlOrPath,
    paths.appBuild
  );
}

async function build(
  target: string,
  preserveModules = true,
  includePrivate = false,
): Promise<void> {
  const targetDirectory = await getLocation(target);

  await setupEnvForDirectory(targetDirectory);

  if (isModularType(targetDirectory, 'app')) {
    await buildApp(target);
  } else {
    const { buildPackage } = await import('./buildPackage');
    // ^ we do a dynamic import here to defer the module's initial side effects
    // till when it's actually needed (i.e. now)

    await buildPackage(target, preserveModules, includePrivate);
  }
}

export default actionPreflightCheck(build);
