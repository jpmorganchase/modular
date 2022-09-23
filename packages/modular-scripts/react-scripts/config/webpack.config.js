'use strict';

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

const { merge } = require('webpack-merge');

const builtinModules = require('builtin-modules');
const PnpWebpackPlugin = require('pnp-webpack-plugin');

const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const logger = require('../../react-dev-utils/logger');

const ModuleScopePlugin = require('../../react-dev-utils/ModuleScopePlugin');
const getCSSModuleLocalIdent = require('../../react-dev-utils/getCSSModuleLocalIdent');
const paths = require('./paths');
const modules = require('./modules');
const createPluginConfig = require('./parts/pluginConfig');
const createLoadersConfig = require('./parts/loadersConfig');
const { createConfig: createEsmViewConfig } = require('./parts/esmViewConfig');
const { createConfig: createAppConfig } = require('./parts/appConfig');
const {
  createConfig: createProductionConfig,
} = require('./parts/productionConfig');
const { createExternalDependenciesMap } = require('./utils/esmUtils');

const isApp = process.env.MODULAR_IS_APP === 'true';
const isEsmView = !isApp;

// If it's an app, set it at ESBUILD_TARGET_FACTORY or default to es2015
// If it's not an app it's an ESM view, then we need es2020
const esbuildTargetFactory = isApp
  ? process.env.ESBUILD_TARGET_FACTORY
    ? JSON.parse(process.env.ESBUILD_TARGET_FACTORY)
    : 'es2015'
  : 'es2020';

const { externalDependencies } = process.env.MODULAR_PACKAGE_DEPS
  ? JSON.parse(process.env.MODULAR_PACKAGE_DEPS)
  : {};

const { externalResolutions } = process.env.MODULAR_PACKAGE_RESOLUTIONS
  ? JSON.parse(process.env.MODULAR_PACKAGE_RESOLUTIONS)
  : {};

const selectiveCDNResolutions = process.env
  .MODULAR_PACKAGE_SELECTIVE_CDN_RESOLUTIONS
  ? JSON.parse(process.env.MODULAR_PACKAGE_SELECTIVE_CDN_RESOLUTIONS)
  : {};

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';

const reactRefreshOverlayEntry = require.resolve(
  '../../react-dev-utils/refreshOverlayInterop',
);

const imageInlineSizeLimit = parseInt(
  process.env.IMAGE_INLINE_SIZE_LIMIT || '10000',
);

// Check if TypeScript is setup
const useTypeScript = fs.existsSync(paths.appTsConfig);

// style files regexes
const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;
const sassRegex = /\.(scss|sass)$/;
const sassModuleRegex = /\.module\.(scss|sass)$/;

// This is the production and development configuration.
// It is focused on developer experience, fast rebuilds, and a minimal bundle.
module.exports = function (webpackEnv) {
  const isEnvDevelopment = webpackEnv === 'development';
  const isEnvProduction = webpackEnv === 'production';
  const isEsmViewDevelopment = isEsmView & isEnvDevelopment;

  // This is needed if we're serving a ESM view in development node, since it won't be defined in the view dependencies.
  if (isEsmViewDevelopment && externalDependencies.react) {
    externalDependencies['react-dom'] = externalDependencies.react;
  }
  if (isEsmViewDevelopment && externalResolutions.react) {
    externalResolutions['react-dom'] = externalResolutions.react;
  }

  // Create a map of external dependencies if we're building a ESM view
  const dependencyMap = isEsmView
    ? createExternalDependenciesMap({
        externalDependencies,
        externalResolutions,
        selectiveCDNResolutions,
      })
    : {};

  // Variable used for enabling profiling in Production
  // passed into alias object. Uses a flag if passed into the build command
  const isEnvProductionProfile =
    isEnvProduction && process.argv.includes('--profile');

  const productionConfig = createProductionConfig({
    shouldUseSourceMap,
    paths,
  });

  const developementConfig = {
    mode: 'development',
    bail: false,
    devtool: 'cheap-module-source-map',
    output: {
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: true,
      // In development, it does not produce real files.
      filename: 'static/js/[name].js',
      // Please remember that Webpack 5, unlike Webpack 4, controls "splitChunks" via fileName, not chunkFilename - https://stackoverflow.com/questions/66077740/webpack-5-output-chunkfilename-not-working
      chunkFilename: 'static/js/[name].chunk.js',
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: (info) =>
        path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
    },
    optimization: {
      minimize: false,
    },
  };

  const baseConfig = {
    // Workaround for this bug: https://stackoverflow.com/questions/53905253/cant-set-up-the-hmr-stuck-with-waiting-for-update-signal-from-wds-in-cons
    target: 'web',
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    // We bundle a virtual file to trampoline the ESM view as an entry point if we're starting it (ESM views have no ReactDOM.render)
    entry: isEsmViewDevelopment ? getVirtualTrampoline() : paths.appIndexJs, // REWRITE
    output: {
      // webpack uses `publicPath` to determine where the app is being served from.
      // It requires a trailing slash, or the file assets will get an incorrect path.
      // We inferred the "public path" (such as / or /my-project) from homepage.
      publicPath: paths.publicUrlOrPath,
    },
    resolve: {
      // This allows you to set a fallback for where webpack should look for modules.
      // We placed these paths second because we want `node_modules` to "win"
      // if there are any conflicts. This matches Node resolution mechanism.
      // https://github.com/facebook/create-react-app/issues/253
      modules: ['node_modules', paths.appNodeModules].concat(
        modules.additionalModulePaths || [],
      ),
      // These are the reasonable defaults supported by the Node ecosystem.
      // We also include JSX as a common component filename extension to support
      // some tools, although we do not recommend using it, see:
      // https://github.com/facebook/create-react-app/issues/290
      // `web` extension prefixes have been added for better support
      // for React Native Web.
      extensions: paths.moduleFileExtensions
        .map((ext) => `.${ext}`)
        .filter((ext) => useTypeScript || !isApp || !ext.includes('ts')),
      alias: {
        // Support React Native Web
        // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
        'react-native': 'react-native-web',
        // Allows for better profiling with ReactDevTools
        ...(isEnvProductionProfile && {
          'react-dom$': 'react-dom/profiling',
          'scheduler/tracing': 'scheduler/tracing-profiling',
        }),
        ...(modules.webpackAliases || {}),
      },
      // Some libraries import Node modules but don't use them in the browser.
      // Tell webpack to provide empty mocks for them so importing them works.
      // See https://github.com/webpack/webpack/issues/11649
      fallback: builtinModules.reduce((acc, next) => {
        acc[next] = false;
        return acc;
      }, {}),
      plugins: [
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin,
        // Prevents users from importing files from outside of src/ (or node_modules/).
        // This often causes confusion because we only process files within src/ with babel.
        // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
        // please link the files into your node_modules/ and let module-resolution kick in.
        // Make sure your source files are compiled, as they will not be processed in any way.
        new ModuleScopePlugin(paths.appSrc, [
          paths.appPackageJson,
          reactRefreshOverlayEntry,
        ]),
      ],
    },
    resolveLoader: {
      plugins: [
        // Also related to Plug'n'Play, but this time it tells webpack to load its loaders
        // from the current package.
        PnpWebpackPlugin.moduleLoader(module),
      ],
    },
    module: {
      strictExportPresence: true,
      rules: [
        {
          // "oneOf" will traverse all following loaders until one will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: [
            // TODO: Merge this config once `image/avif` is in the mime-db
            // https://github.com/jshttp/mime-db
            {
              test: [/\.avif$/],
              type: 'asset',
              mimetype: 'image/avif',
              parser: {
                dataUrlCondition: {
                  maxSize: imageInlineSizeLimit,
                },
              },
              generator: {
                filename: 'static/media/[name].[hash:8].[ext]',
              },
            },
            // "url" loader works like "file" loader except that it embeds assets
            // smaller than specified limit in bytes as data URLs to avoid requests.
            // A missing `test` is equivalent to a match.
            {
              test: /\.(bmp|gif|jpe?g|png|ico|eot|ttf|woff2?)(\?v=\d+\.\d+\.\d+)?$/i,
              type: 'asset',
              parser: {
                dataUrlCondition: {
                  maxSize: imageInlineSizeLimit,
                },
              },
              generator: {
                filename: 'static/media/[name].[hash:8].[ext]',
              },
            },
            {
              test: /\.svg$/,
              use: [
                {
                  loader: require.resolve('@svgr/webpack'),
                  options: {
                    prettier: false,
                    svgo: false,
                    svgoConfig: {
                      plugins: [{ removeViewBox: false }],
                    },
                    titleProp: true,
                    ref: true,
                  },
                },
                {
                  loader: require.resolve('file-loader'),
                  options: {
                    name: 'static/media/[name].[hash].[ext]',
                  },
                },
              ],
              issuer: {
                and: [/\.(ts|tsx|js|jsx|md|mdx)$/],
              },
            },
            // Process application JS with esbuild.
            {
              test: /\.(js|mjs|jsx)$/,
              include: paths.modularSrc,
              loader: require.resolve('esbuild-loader'),
              options: {
                implementation: require('esbuild'),
                loader: 'tsx',
                target: esbuildTargetFactory,
              },
            },
            {
              test: /\.ts$/,
              include: paths.modularSrc,
              loader: require.resolve('esbuild-loader'),
              options: {
                implementation: require('esbuild'),
                loader: 'ts',
                target: esbuildTargetFactory,
              },
            },
            {
              test: /\.tsx$/,
              include: paths.modularSrc,
              loader: require.resolve('esbuild-loader'),
              options: {
                implementation: require('esbuild'),
                loader: 'tsx',
                target: esbuildTargetFactory,
              },
            },
            // "postcss" loader applies autoprefixer to our CSS.
            // "css" loader resolves paths in CSS and adds assets as dependencies.
            // "style" loader turns CSS into JS modules that inject <style> tags.
            // In production, we use MiniCSSExtractPlugin to extract that CSS
            // to a file, but in development "style" loader enables hot editing
            // of CSS.
            // By default we support CSS Modules with the extension .module.css
            {
              test: cssRegex,
              exclude: cssModuleRegex,
              use: createLoadersConfig({
                cssOptions: {
                  importLoaders: 1,
                  sourceMap: isEnvProduction
                    ? shouldUseSourceMap
                    : isEnvDevelopment,
                },

                includeEsmLoader: isEsmView,
                dependencyMap,
                isEnvProduction,
                shouldUseSourceMap,
              }),

              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
            // using the extension .module.css
            {
              test: cssModuleRegex,
              use: createLoadersConfig({
                cssOptions: {
                  importLoaders: 1,
                  sourceMap: isEnvProduction
                    ? shouldUseSourceMap
                    : isEnvDevelopment,
                  modules: {
                    getLocalIdent: getCSSModuleLocalIdent,
                  },
                },
                dependencyMap,
                isEnvProduction,
                shouldUseSourceMap,
              }),
            },
            // Opt-in support for SASS (using .scss or .sass extensions).
            // By default we support SASS Modules with the
            // extensions .module.scss or .module.sass
            {
              test: sassRegex,
              exclude: sassModuleRegex,
              use: createLoadersConfig({
                cssOptions: {
                  importLoaders: 3,
                  sourceMap: isEnvProduction
                    ? shouldUseSourceMap
                    : isEnvDevelopment,
                },
                preProcessor: require.resolve('sass-loader'),
                dependencyMap,
                isEnvProduction,
                shouldUseSourceMap,
              }),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // Adds support for CSS Modules, but using SASS
            // using the extension .module.scss or .module.sass
            {
              test: sassModuleRegex,
              use: createLoadersConfig({
                cssOptions: {
                  importLoaders: 3,
                  sourceMap: isEnvProduction
                    ? shouldUseSourceMap
                    : isEnvDevelopment,
                  modules: {
                    getLocalIdent: getCSSModuleLocalIdent,
                  },
                },
                preProcessor: require.resolve('sass-loader'),
                dependencyMap,
                isEnvProduction,
                shouldUseSourceMap,
              }),
            },
            // "file" loader makes sure those assets get served by WebpackDevServer.
            // When you `import` an asset, you get its (virtual) filename.
            // In production, they would get copied to the `build` folder.
            // This loader doesn't use a "test" so it will catch all modules
            // that fall through the other loaders.
            {
              loader: require.resolve('file-loader'),
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpacks internal loaders.
              exclude: [/(^|\.(js|mjs|jsx|ts|tsx|html|json))$/],
              options: {
                name: 'static/media/[name].[hash:8].[ext]',
              },
            },
            // ** STOP ** Are you adding a new loader?
            // Make sure to add the new loader(s) before the "file" loader.
          ],
        },
      ],
    },
    optimization: {
      minimizer: [
        // This is only used in production mode
        new TerserPlugin({
          terserOptions: {
            parse: {
              // We want terser to parse ecma 8 code. However, we don't want it
              // to apply any minification steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,
              // Disabled because of an issue with Terser breaking valid code:
              // https://github.com/facebook/create-react-app/issues/5250
              // Pending further investigation:
              // https://github.com/terser-js/terser/issues/120
              inline: 2,
            },
            mangle: {
              safari10: true,
            },
            // Added for profiling in devtools
            keep_classnames: isEnvProductionProfile,
            keep_fnames: isEnvProductionProfile,
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            },
          },
        }),
        new CssMinimizerPlugin(),
      ],
    },
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false,
  };

  const pluginConfig = createPluginConfig({
    isApp,
    isEnvProduction,
    shouldUseSourceMap,
    useTypeScript,
  });

  const webpackConfig = merge([
    baseConfig,
    isApp ? createAppConfig() : createEsmViewConfig({ dependencyMap }),
    isEnvProduction ? productionConfig : developementConfig,
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

// Virtual entrypoint if we're starting a ESM view - see https://github.com/webpack/webpack/issues/6437
function getVirtualTrampoline() {
  // Build the relative path between the root and the entrypoint.
  const relativeEntrypointPath = path
    .relative(paths.appPath, paths.appIndexJs)
    .split(path.sep)
    .join(path.posix.sep); // Separator could be win32 on Windows system, since it comes from a filesystem path. Force it to be posix since it's an URL

  const entryPointPath = `'./${relativeEntrypointPath}'`;
  const string = `
  import ReactDOM from 'react-dom'
  import React from 'react';
  import Component from ${entryPointPath};
  const DOMRoot = document.getElementById('root');
  ReactDOM.render(React.createElement(Component, null), DOMRoot);
	`;

  const base64 = Buffer.from(string).toString('base64');
  return `./src/_trampoline.js!=!data:text/javascript;base64,${base64}`;
}
