import { paramCase as toParamCase } from 'change-case';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as logger from '../utils/logger';
import getModularRoot from '../utils/getModularRoot';
import actionPreflightCheck from '../utils/actionPreflightCheck';
import { getModularType } from '../utils/isModularType';
import type { ModularType } from '../utils/isModularType';
import execAsync from '../utils/execAsync';
import getLocation from '../utils/getLocation';
import { setupEnvForDirectory } from '../utils/setupEnv';
import createPaths from '../utils/createPaths';
import printHostingInstructions from './printHostingInstructions';
import { Asset, printFileSizesAfterBuild } from './fileSizeReporter';
import type { Stats } from 'webpack';
import { checkBrowsers } from '../utils/checkBrowsers';
import checkRequiredFiles from '../utils/checkRequiredFiles';
import createEsbuildBrowserslistTarget from '../utils/createEsbuildBrowserslistTarget';
import {
  webpackMeasureFileSizesBeforeBuild,
  createWebpackAssets,
} from './webpackFileSizeReporter';
import {
  createEsbuildAssets,
  esbuildMeasureFileSizesBeforeBuild,
} from './esbuildFileSizeReporter';
import { getPackageDependencies } from '../utils/getPackageDependencies';
import type { CoreProperties } from '@schemastore/package';
import { createViewTrampoline } from './createViewTrampoline';

async function buildAppOrView(
  target: string,
  type: Extract<ModularType, 'app' | 'view'>,
) {
  // True if there's no preference set - or the preference is for webpack.
  const useWebpack =
    !process.env.USE_MODULAR_WEBPACK ||
    process.env.USE_MODULAR_WEBPACK === 'true';

  // True if the preferene IS set and the preference is esbuid.
  const useEsbuild =
    process.env.USE_MODULAR_ESBUILD &&
    process.env.USE_MODULAR_ESBUILD === 'true';

  // If you want to use webpack then we'll always use webpack. But if you've indicated
  // you want esbuild - then we'll switch you to the new fancy world.
  const isEsbuild = !useWebpack || useEsbuild;

  // Setup Paths
  const modularRoot = getModularRoot();
  const targetDirectory = await getLocation(target);
  const targetName = toParamCase(target);

  const paths = await createPaths(target);
  const isApp = type === 'app';

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

  if (isApp) {
    await fs.copy(paths.appPublic, paths.appBuild, {
      dereference: true,
      filter: (file) => file !== paths.appHtml,
      overwrite: true,
    });
  }

  let assets: Asset[];
  // Retrieve dependencies for target to inform the build process
  const packageDependencies = await getPackageDependencies(target);
  const dependencyNames = Object.keys(packageDependencies);

  let jsEntrypointPath;

  const browserTarget = createEsbuildBrowserslistTarget(targetDirectory);

  // If not app, build a view as an ES module with esbuild for now
  if (isEsbuild || !isApp) {
    const { default: buildEsbuildApp } = await import(
      '../esbuild-scripts/build'
    );
    const result = await buildEsbuildApp(
      target,
      paths,
      packageDependencies,
      type,
    );

    // Find the main asset as the only .js asset in the esbuild outputs
    jsEntrypointPath = Object.keys(result.outputs).find((assetName) =>
      assetName.endsWith('.js'),
    );

    assets = createEsbuildAssets(paths, result);
  } else {
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

      assets = createWebpackAssets(paths, stats);
    } finally {
      await fs.remove(statsFilePath);
    }
  }

  if (!isApp) {
    if (!jsEntrypointPath) {
      throw new Error("Couldn't identify the compiled main asset");
    }
    await createViewTrampoline(
      paths.appBuild,
      path.basename(jsEntrypointPath),
      paths.appSrc,
      packageDependencies,
      browserTarget,
    );
  }

  // Add dependencies from source and bundled dependencies to target package.json
  const targetPackageJson = (await fs.readJSON(
    path.join(targetDirectory, 'package.json'),
  )) as CoreProperties;
  targetPackageJson.dependencies = packageDependencies;
  if (isApp) {
    targetPackageJson.bundledDependencies = dependencyNames;
  }
  // Copy selected fields of package.json over
  await fs.writeJSON(
    path.join(paths.appBuild, 'package.json'),
    {
      name: targetPackageJson.name,
      version: targetPackageJson.version,
      license: targetPackageJson.license,
      modular: targetPackageJson.modular,
      dependencies: targetPackageJson.dependencies,
      // Views are ESM libraries with one only js entrypoint; add it to the "module" field
      module:
        jsEntrypointPath && !isApp
          ? path.relative(paths.appBuild, jsEntrypointPath)
          : undefined,
    },
    { spaces: 2 },
  );

  printFileSizesAfterBuild(assets, previousFileSizes);

  printHostingInstructions(
    fs.readJSON(paths.appPackageJson),
    paths.publicUrlOrPath,
    paths.publicUrlOrPath,
    paths.appBuild,
  );
}

async function build(
  target: string,
  preserveModules = true,
  includePrivate = false,
): Promise<void> {
  const targetDirectory = await getLocation(target);

  await setupEnvForDirectory(targetDirectory);

  const targetType = getModularType(targetDirectory);
  if (targetType === 'app' || targetType === 'view') {
    await buildAppOrView(target, targetType);
  } else {
    const { buildPackage } = await import('./buildPackage');
    // ^ we do a dynamic import here to defer the module's initial side effects
    // till when it's actually needed (i.e. now)

    await buildPackage(target, preserveModules, includePrivate);
  }
}

export default actionPreflightCheck(build);
