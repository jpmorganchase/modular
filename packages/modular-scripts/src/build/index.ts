import { paramCase as toParamCase } from 'change-case';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as logger from '../utils/logger';
import * as minimize from 'html-minifier-terser';
import getModularRoot from '../utils/getModularRoot';
import actionPreflightCheck from '../utils/actionPreflightCheck';
import { getModularType } from '../utils/isModularType';
import { filterDependencies } from '../utils/filterDependencies';
import getWorkspaceInfo from '../utils/getWorkspaceInfo';
import type { ModularType } from '../utils/isModularType';
import execAsync from '../utils/execAsync';
import getLocation from '../utils/getLocation';
import { setupEnvForDirectory } from '../utils/setupEnv';
import createPaths from '../utils/createPaths';
import printHostingInstructions from './printHostingInstructions';
import { Asset, printFileSizesAfterBuild } from './fileSizeReporter';
import type { StatsCompilation } from 'webpack';
import { checkBrowsers } from '../utils/checkBrowsers';
import checkRequiredFiles from '../utils/checkRequiredFiles';
import createEsbuildBrowserslistTarget from '../utils/createEsbuildBrowserslistTarget';
import getClientEnvironment from '../esbuild-scripts/config/getClientEnvironment';
import {
  createSyntheticIndex,
  getEntryPoint,
  createViewTrampoline,
} from '../esbuild-scripts/api';
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

async function buildStandalone(
  target: string,
  type: Extract<ModularType, 'app' | 'esm-view'>,
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
  logger.debug('Extracting dependencies from source code...');
  // Retrieve dependencies for target to inform the build process
  const { manifest: packageDependencies, resolutions: packageResolutions } =
    await getPackageDependencies(target);
  // Get workspace info to automatically bundle workspace dependencies
  const workspaceInfo = await getWorkspaceInfo();
  // Split dependencies between external and bundled
  const { external: externalDependencies, bundled: bundledDependencies } =
    filterDependencies({
      dependencies: packageDependencies,
      isApp,
      workspaceInfo,
    });
  const { external: externalResolutions, bundled: bundledResolutions } =
    filterDependencies({
      dependencies: packageResolutions,
      isApp,
      workspaceInfo,
    });

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

  const browserTarget = createEsbuildBrowserslistTarget(targetDirectory);

  let jsEntryPoint: string | undefined;
  let cssEntryPoint: string | undefined;

  if (isEsbuild) {
    const { default: buildEsbuildApp } = await import(
      '../esbuild-scripts/build'
    );
    const result = await buildEsbuildApp(
      target,
      paths,
      externalDependencies,
      externalResolutions,
      type,
    );
    jsEntryPoint = getEntryPoint(paths, result, '.js');
    cssEntryPoint = getEntryPoint(paths, result, '.css');
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
        MODULAR_IS_APP: JSON.stringify(isApp),
        MODULAR_PACKAGE_DEPS: JSON.stringify({
          externalDependencies,
          bundledDependencies,
        }),
        MODULAR_PACKAGE_RESOLUTIONS: JSON.stringify({
          externalResolutions,
          bundledResolutions,
        }),
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

  // If view, write the synthetic index.html and create a trampoline file pointing to the main entrypoint
  // This is for both esbuild and webpack so it lives here. If app, instead, the public/index.html file is generated specifical in different ways.
  if (!isApp) {
    if (!jsEntryPoint) {
      throw new Error("Can't find main entrypoint after building");
    }
    // Create synthetic index
    const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));
    const html = createSyntheticIndex({ cssEntryPoint, replacements: env.raw });
    await fs.writeFile(
      path.join(paths.appBuild, 'index.html'),
      await minimize.minify(html, {
        html5: true,
        collapseBooleanAttributes: true,
        collapseWhitespace: true,
        collapseInlineTagWhitespace: true,
        decodeEntities: true,
        minifyCSS: true,
        minifyJS: true,
        removeAttributeQuotes: false,
        removeComments: true,
        removeTagWhitespace: true,
      }),
    );

    // Create and write trampoline file
    const trampolineBuildResult = await createViewTrampoline(
      path.basename(jsEntryPoint),
      paths.appSrc,
      externalDependencies,
      externalResolutions,
      browserTarget,
    );
    const trampolinePath = `${paths.appBuild}/static/js/_trampoline.js`;
    await fs.writeFile(
      trampolinePath,
      trampolineBuildResult.outputFiles[0].contents,
    );
  }

  // Add dependencies from source and bundled dependencies to target package.json
  const targetPackageJson = (await fs.readJSON(
    path.join(targetDirectory, 'package.json'),
  )) as CoreProperties;
  targetPackageJson.dependencies = packageDependencies;
  targetPackageJson.bundledDependencies = Object.keys(bundledDependencies);

  // Copy selected fields of package.json over
  await fs.writeJSON(
    path.join(paths.appBuild, 'package.json'),
    {
      name: targetPackageJson.name,
      version: targetPackageJson.version,
      license: targetPackageJson.license,
      modular: targetPackageJson.modular,
      dependencies: targetPackageJson.dependencies,
      bundledDependencies: targetPackageJson.bundledDependencies,
      module: jsEntryPoint ? paths.publicUrlOrPath + jsEntryPoint : undefined,
      style: cssEntryPoint ? paths.publicUrlOrPath + cssEntryPoint : undefined,
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

async function build(
  target: string,
  preserveModules = true,
  includePrivate = false,
): Promise<void> {
  const targetDirectory = await getLocation(target);

  await setupEnvForDirectory(targetDirectory);

  const targetType = getModularType(targetDirectory);
  if (targetType === 'app' || targetType === 'esm-view') {
    await buildStandalone(target, targetType);
  } else {
    const { buildPackage } = await import('./buildPackage');
    // ^ we do a dynamic import here to defer the module's initial side effects
    // till when it's actually needed (i.e. now)

    await buildPackage(target, preserveModules, includePrivate);
  }
}

export default actionPreflightCheck(build);
