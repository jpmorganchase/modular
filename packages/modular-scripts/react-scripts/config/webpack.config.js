'use strict';

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

const { merge } = require('webpack-merge');

const logger = require('../../react-dev-utils/logger');

const paths = require('./paths');
const modules = require('./modules');
const createPluginConfig = require('./parts/pluginConfig');
const { createConfig: createEsmViewConfig } = require('./parts/esmViewConfig');
const { createConfig: createAppConfig } = require('./parts/appConfig');
const {
  createConfig: createDevelopmentConfig,
} = require('./parts/developmentConfig');
const {
  createConfig: createProductionConfig,
} = require('./parts/productionConfig');
const { createConfig: createBaseConfig } = require('./parts/baseConfig');

const isApp = process.env.MODULAR_IS_APP === 'true';

// If it's an app, set it at ESBUILD_TARGET_FACTORY or default to es2015
// If it's not an app it's an ESM view, then we need es2020
const esbuildTargetFactory = isApp
  ? process.env.ESBUILD_TARGET_FACTORY
    ? JSON.parse(process.env.ESBUILD_TARGET_FACTORY)
    : 'es2015'
  : 'es2020';

const dependencyMap = process.env.MODULAR_IMPORT_MAP
  ? JSON.parse(process.env.MODULAR_IMPORT_MAP)
  : {};

const useReactCreateRoot = process.env.MODULAR_USE_REACT_CREATE_ROOT
  ? JSON.parse(process.env.MODULAR_USE_REACT_CREATE_ROOT)
  : false;

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';

const imageInlineSizeLimit = parseInt(
  process.env.IMAGE_INLINE_SIZE_LIMIT || '10000',
);

// Check if TypeScript is setup
const useTypeScript = fs.existsSync(paths.appTsConfig);

// This is the production and development configuration.
// It is focused on developer experience, fast rebuilds, and a minimal bundle.
module.exports = function (webpackEnv) {
  const isEnvProduction = webpackEnv === 'production';

  // Variable used for enabling profiling in Production
  // passed into alias object. Uses a flag if passed into the build command
  const isEnvProductionProfile =
    isEnvProduction && process.argv.includes('--profile');

  // Create configurations

  // base, common configuration
  const baseConfig = createBaseConfig({
    isEnvProduction,
    isApp,
    paths,
    useTypeScript,
    isEnvProductionProfile,
    imageInlineSizeLimit,
    modules,
    shouldUseSourceMap,
    esbuildTargetFactory,
    dependencyMap,
  });

  // Specific configuration based on modular type (app, esm-view)
  const modularTypeConfiguration = isApp
    ? createAppConfig()
    : createEsmViewConfig({
        dependencyMap,
        paths,
        isEnvProduction,
        useReactCreateRoot,
      });

  // Specific configuration based on build type (production, development)
  const buildTypeConfiguration = isEnvProduction
    ? createProductionConfig({
        shouldUseSourceMap,
        paths,
      })
    : createDevelopmentConfig({ path });

  // Plugin configuration
  const pluginConfig = createPluginConfig({
    isApp,
    isEnvProduction,
    shouldUseSourceMap,
    useTypeScript,
  });

  // Merge all configurations into the final one
  const webpackConfig = merge([
    baseConfig,
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
    },
    'react-monaco-editor': {
      package: 'monaco-editor-webpack-plugin',
      options: {
        languages: ['json', 'generic'],
      },
    },
  };

  Object.keys(dependencyPlugins).forEach((dependency) => {
    const plugin = dependencyPlugins[dependency];
    try {
      // test whether the dependency has been installed.
      // if not don't install the corresponding plugin
      require.resolve(dependency);
      try {
        require.resolve(plugin.package);
      } catch (err) {
        logger.info(
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
      const WebpackPlugin = require(plugin.package);

      webpackConfig.plugins.push(new WebpackPlugin(plugin.options));
    } catch (err) {
      /* silently fail */
    }
  });

  return webpackConfig;
};
