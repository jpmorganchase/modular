import chalk from 'chalk';
import fs from 'fs';

import { merge } from 'webpack-merge';

import * as logger from '../../utils/logger';
import getModules from './modules';
import createPluginConfig from './parts/pluginConfig';
import { createEsmViewConfig } from './parts/esmViewConfig';
import { createAppConfig } from './parts/appConfig';
import { createDevelopmentConfig } from './parts/developmentConfig';
import { createProductionConfig } from './parts/productionConfig';
import { createConfig as createBaseConfig } from './parts/baseConfig';
import { getConfig } from '../../utils/config';
import { Paths } from '../../utils/determineTargetPaths';
import { Configuration, WebpackPluginInstance } from 'webpack';
// Source maps are resource heavy and can cause out of memory issue for large source files.

const imageInlineSizeLimit = parseInt(
  process.env.IMAGE_INLINE_SIZE_LIMIT || '10000',
);

/**
 * Generate Webpack Configuration
 * This is the production and development configuration.
 * It is focused on developer experience, fast rebuilds, and a minimal bundle.
 * @param isEnvProduction True when building, false when just starting
 * @param esbuildTargetFactory
 * @param isApp
 * @param dependencyMap
 * @param useReactCreateRoot
 * @param styleImports
 * @param targetPaths
 * @returns Promise containing webpack configuration
 */
export default async function getWebpackConfig(
  isEnvProduction: boolean,
  esbuildTargetFactory: string[],
  isApp: boolean,
  dependencyMap: Map<string, string>,
  useReactCreateRoot: boolean,
  styleImports: Set<string>,
  targetPaths: Paths,
): Promise<Configuration> {
  // Check if TypeScript is setup
  const useTypeScript = fs.existsSync(targetPaths.appTsConfig);
  const shouldUseSourceMap = getConfig(
    'generateSourceMap',
    targetPaths.appPath,
  );

  // Variable used for enabling profiling in Production
  // passed into alias object. Uses a flag if passed into the build command
  const isEnvProductionProfile =
    isEnvProduction && process.argv.includes('--profile');

  // Create configurations
  const modules = getModules(targetPaths);
  // base, common configuration
  const baseConfig: Configuration = createBaseConfig({
    isEnvProduction,
    isApp,
    paths: targetPaths,
    useTypeScript,
    isEnvProductionProfile,
    imageInlineSizeLimit,
    modules,
    shouldUseSourceMap,
    esbuildTargetFactory,
    dependencyMap,
  });

  const performanceConfiguration: Configuration = {
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false,
  };

  // Specific configuration based on modular type (app, esm-view)
  const modularTypeConfiguration: Configuration = isApp
    ? createAppConfig()
    : createEsmViewConfig(
        dependencyMap,
        targetPaths,
        isEnvProduction,
        useReactCreateRoot,
      );

  // Specific configuration based on build type (production, development)
  const buildTypeConfiguration: Configuration = isEnvProduction
    ? createProductionConfig(shouldUseSourceMap, targetPaths)
    : createDevelopmentConfig();

  // Plugin configuration
  const pluginConfig: Configuration = createPluginConfig(
    isApp,
    isEnvProduction,
    shouldUseSourceMap,
    useTypeScript,
    styleImports,
    targetPaths,
  );

  // Merge all configurations into the final one
  const webpackConfig: Configuration = merge([
    baseConfig,
    performanceConfiguration,
    modularTypeConfiguration,
    buildTypeConfiguration,
    pluginConfig,
  ]);

  // These dependencies are so widely used for us (JPM) that it makes sense to install
  // their webpack plugin when used.
  // NOTE: this doesn't include the dependencies themselves in your app.
  const dependencyPlugins = {
    '@finos/perspective': {
      package: '@finos/perspective-webpack-plugin',
      options: {},
    },
    'react-monaco-editor': {
      package: 'monaco-editor-webpack-plugin',
      options: {
        languages: ['json', 'generic'],
      },
    },
  };

  for (const [dependency, plugin] of Object.entries(dependencyPlugins)) {
    try {
      // test whether the dependency has been installed.
      // if not don't install the corresponding plugin
      require.resolve(dependency);
      try {
        require.resolve(plugin.package);
      } catch (err) {
        logger.log(
          `It appears you're using ${chalk.cyan(
            dependency,
          )}. Run ${chalk.cyan.bold(
            `yarn add -D ${plugin.package}`,
          )} to install`,
        );
        throw err;
      }
      // both dependency and its webpack plugin are available, let's
      // add it to our webpack pipeline.
      const WebpackPlugin = (await import(
        plugin.package
      )) as WebpackPluginInstanceConstructor;

      if (webpackConfig.plugins) {
        webpackConfig.plugins.push(new WebpackPlugin(plugin.options));
      } else {
        webpackConfig.plugins = [new WebpackPlugin(plugin.options)];
      }
    } catch (err) {
      /* silently fail */
    }
  }

  return webpackConfig;
}

/**
 * Interface to satisfy TS linting for Webpack Plugin stuff
 */
interface WebpackPluginInstanceConstructor {
  new (options: unknown): WebpackPluginInstance;
}
