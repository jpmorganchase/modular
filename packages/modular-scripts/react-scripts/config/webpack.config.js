'use strict';

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const resolve = require('resolve');
const PnpWebpackPlugin = require('pnp-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const InlineChunkHtmlPlugin = require('../../react-dev-utils/InlineChunkHtmlPlugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const { info } = require('../../react-dev-utils/logger');
const InterpolateHtmlPlugin = require('../../react-dev-utils/InterpolateHtmlPlugin');
const WatchMissingNodeModulesPlugin = require('../../react-dev-utils/WatchMissingNodeModulesPlugin');
const ModuleScopePlugin = require('../../react-dev-utils/ModuleScopePlugin');
const getCSSModuleLocalIdent = require('../../react-dev-utils/getCSSModuleLocalIdent');
const paths = require('./paths');
const modules = require('./modules');
const getClientEnvironment = require('./env');
const ModuleNotFoundPlugin = require('../../react-dev-utils/ModuleNotFoundPlugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const postcssNormalize = require('postcss-normalize');
const isCI = require('is-ci');

const isApp = process.env.MODULAR_IS_APP === 'true';
const isView = !isApp;

const esbuildTargetFactory = isApp
  ? process.env.ESBUILD_TARGET_FACTORY
    ? JSON.parse(process.env.ESBUILD_TARGET_FACTORY)
    : 'es2015'
  : 'es2020';

const { externalDependencies } = process.env.MODULAR_PACKAGE_DEPS
  ? JSON.parse(process.env.MODULAR_PACKAGE_DEPS)
  : {};

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';

const reactRefreshOverlayEntry = require.resolve(
  '../../react-dev-utils/refreshOverlayInterop',
);

// Some apps do not need the benefits of saving a web request, so not inlining the chunk
// makes for a smoother build process.
const shouldInlineRuntimeChunk = process.env.INLINE_RUNTIME_CHUNK !== 'false';

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
  const isViewDevelopment = isView & isEnvDevelopment;

  // This is needed if we're serving a view in development node, since it won't be defined in the view dependencies.
  if (externalDependencies.react && isViewDevelopment) {
    externalDependencies['react-dom'] = externalDependencies.react;
  }

  // Create an import map of external dependencies if we're building a view
  const importMap = isView
    ? createExternalDependenciesMap(externalDependencies)
    : {};

  // Variable used for enabling profiling in Production
  // passed into alias object. Uses a flag if passed into the build command
  const isEnvProductionProfile =
    isEnvProduction && process.argv.includes('--profile');

  // We will provide `paths.publicUrlOrPath` to our app
  // as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
  // Omit trailing slash as %PUBLIC_URL%/xyz looks better than %PUBLIC_URL%xyz.
  // Get environment variables to inject into our app.
  const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));

  // common function to get style loaders
  const getStyleLoaders = (cssOptions, preProcessor) => {
    const loaders = [
      isEnvDevelopment && require.resolve('style-loader'),
      isEnvProduction && {
        loader: MiniCssExtractPlugin.loader,
        // css is located in `static/css`, use '../../' to locate index.html folder
        // in production `paths.publicUrlOrPath` can be a relative path
        options: paths.publicUrlOrPath.startsWith('.')
          ? { publicPath: '../../' }
          : {},
      },
      {
        loader: require.resolve('css-loader'),
        options: cssOptions,
      },
      {
        // Options for PostCSS as we reference these options twice
        // Adds vendor prefixing based on your specified browser support in
        // package.json
        loader: require.resolve('postcss-loader'),
        options: {
          postcssOptions: {
            plugins: [
              require('postcss-flexbugs-fixes'),
              require('postcss-preset-env')({
                autoprefixer: {
                  flexbox: 'no-2009',
                },
                stage: 3,
              }),
              // Adds PostCSS Normalize as the reset css with default options,
              // so that it honors browserslist config in package.json
              // which in turn let's users customize the target behavior as per their needs.
              postcssNormalize(),
            ],
          },
          sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
          implementation: require('postcss'),
        },
      },
    ].filter(Boolean);
    if (preProcessor) {
      loaders.push(
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
            root: paths.appSrc,
          },
        },
        {
          loader: preProcessor,
          options: {
            sourceMap: true,
          },
        },
      );
    }
    return loaders;
  };

  const webpackConfig = {
    externals: isApp
      ? undefined
      : function ({ request }, callback) {
          const parsedModule = parsePackageName(request);

          // If the module is absolute and it is in the import map, we want to externalise it
          if (
            parsedModule &&
            parsedModule.dependencyName &&
            importMap[parsedModule.dependencyName]
          ) {
            const { dependencyName, submodule } = parsedModule;

            const toRewrite = `${importMap[dependencyName]}${
              submodule ? `/${submodule}` : ''
            }`;

            return callback(null, toRewrite);
          }
          // Otherwise we just want to bundle it
          return callback();
        },

    externalsType: isApp ? undefined : 'module',
    experiments: {
      outputModule: isApp ? undefined : true,
    },
    // Workaround for this bug: https://stackoverflow.com/questions/53905253/cant-set-up-the-hmr-stuck-with-waiting-for-update-signal-from-wds-in-cons
    target: 'web',
    mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
    // Stop compilation early in production
    bail: isEnvProduction,
    devtool: isEnvProduction
      ? shouldUseSourceMap
        ? 'source-map'
        : false
      : isEnvDevelopment && 'cheap-module-source-map',
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    // We bundle a virtual file to trampoline the view as an entry point if we're starting it (views have no ReactDOM.render)
    entry: isViewDevelopment ? getVirtualTrampoline() : paths.appIndexJs,
    output: {
      module: isApp ? undefined : true,
      library: isApp
        ? undefined
        : {
            type: 'module',
          },
      // The build folder.
      path: isEnvProduction ? paths.appBuild : undefined,
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: isEnvDevelopment,
      // There will be one main bundle, and one file per asynchronous chunk.
      // In development, it does not produce real files.
      filename: isEnvProduction
        ? 'static/js/[name].[contenthash:8].js'
        : isEnvDevelopment && 'static/js/[name].js',
      // There are also additional JS chunk files if you use code splitting.
      // Please remember that Webpack 5, unlike Webpack 4, controls "splitChunks" via fileName, not chunkFilename - https://stackoverflow.com/questions/66077740/webpack-5-output-chunkfilename-not-working
      chunkFilename: isEnvProduction
        ? 'static/js/[name].[contenthash:8].chunk.js'
        : isEnvDevelopment && 'static/js/[name].chunk.js',
      // webpack uses `publicPath` to determine where the app is being served from.
      // It requires a trailing slash, or the file assets will get an incorrect path.
      // We inferred the "public path" (such as / or /my-project) from homepage.
      publicPath: paths.publicUrlOrPath,
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: isEnvProduction
        ? (info) =>
            path
              .relative(paths.appSrc, info.absoluteResourcePath)
              .replace(/\\/g, '/')
        : isEnvDevelopment &&
          ((info) =>
            path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')),
    },
    optimization: {
      minimize: isEnvProduction,
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
      // Automatically split vendor and commons
      // https://twitter.com/wSokra/status/969633336732905474
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      splitChunks: isApp
        ? {
            chunks: 'all',
          }
        : undefined,
      // Keep the runtime chunk separated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      // https://github.com/facebook/create-react-app/issues/5358
      runtimeChunk: isApp
        ? {
            name: (entrypoint) => `runtime-${entrypoint.name}`,
          }
        : undefined,
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
      fallback: {
        module: false,
        dgram: false,
        dns: false,
        fs: false,
        http2: false,
        net: false,
        tls: false,
        child_process: false,
      },
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
            // Required since esbuild loader will not pass svg the same as babel-loader
            // was handling them
            {
              test: /\.svg$/,
              use: [
                require.resolve('@svgr/webpack'),
                require.resolve('url-loader'),
              ],
            },
            // TODO: Merge this config once `image/avif` is in the mime-db
            // https://github.com/jshttp/mime-db
            {
              test: [/\.avif$/],
              loader: require.resolve('url-loader'),
              options: {
                limit: imageInlineSizeLimit,
                mimetype: 'image/avif',
                name: 'static/media/[name].[hash:8].[ext]',
              },
            },
            // "url" loader works like "file" loader except that it embeds assets
            // smaller than specified limit in bytes as data URLs to avoid requests.
            // A missing `test` is equivalent to a match.
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              loader: require.resolve('url-loader'),
              options: {
                limit: imageInlineSizeLimit,
                name: 'static/media/[name].[hash:8].[ext]',
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
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction
                  ? shouldUseSourceMap
                  : isEnvDevelopment,
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
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction
                  ? shouldUseSourceMap
                  : isEnvDevelopment,
                modules: {
                  getLocalIdent: getCSSModuleLocalIdent,
                },
              }),
            },
            // Opt-in support for SASS (using .scss or .sass extensions).
            // By default we support SASS Modules with the
            // extensions .module.scss or .module.sass
            {
              test: sassRegex,
              exclude: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 3,
                  sourceMap: isEnvProduction
                    ? shouldUseSourceMap
                    : isEnvDevelopment,
                },
                require.resolve('sass-loader'),
              ),
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
              use: getStyleLoaders(
                {
                  importLoaders: 3,
                  sourceMap: isEnvProduction
                    ? shouldUseSourceMap
                    : isEnvDevelopment,
                  modules: {
                    getLocalIdent: getCSSModuleLocalIdent,
                  },
                },
                require.resolve('sass-loader'),
              ),
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
    plugins: [
      // Generates an `index.html` file with the <script> injected.
      isApp
        ? new HtmlWebpackPlugin(
            Object.assign(
              {},
              {
                inject: true,
                template: paths.appHtml,
              },
              isEnvProduction
                ? {
                    minify: {
                      removeComments: true,
                      collapseWhitespace: true,
                      removeRedundantAttributes: true,
                      useShortDoctype: true,
                      removeEmptyAttributes: true,
                      removeStyleLinkTypeAttributes: true,
                      keepClosingSlash: true,
                      minifyJS: true,
                      minifyCSS: true,
                      minifyURLs: true,
                    },
                  }
                : undefined,
            ),
          )
        : isViewDevelopment
        ? // We need to provide a synthetic index.html in case we're starting a view
          new HtmlWebpackPlugin(
            Object.assign(
              {},
              {
                inject: true,
                templateContent: `
                <html>
                  <body>
                    <div id="root"></div>
                  </body>
                </html>
                `,
                scriptLoading: 'module',
              },
            ),
          )
        : false,
      // Inlines the webpack runtime script. This script is too small to warrant
      // a network request.
      // https://github.com/facebook/create-react-app/issues/5358
      isApp &&
        isEnvProduction &&
        shouldInlineRuntimeChunk &&
        new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime-.+[.]js/]),
      // Makes some environment variables available in index.html.
      // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
      // <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
      // It will be an empty string unless you specify "homepage"
      // in `package.json`, in which case it will be the pathname of that URL.
      isApp && new InterpolateHtmlPlugin(HtmlWebpackPlugin, env.raw),
      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(paths.appPath),
      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
      // It is absolutely essential that NODE_ENV is set to production
      // during a production build.
      // Otherwise React will be compiled in the very slow development mode.
      new webpack.DefinePlugin(env.stringified),
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebook/create-react-app/issues/240
      isEnvDevelopment && new CaseSensitivePathsPlugin(),
      // If you require a missing module and then `npm install` it, you still have
      // to restart the development server for webpack to discover it. This plugin
      // makes the discovery automatic so you don't have to restart.
      // See https://github.com/facebook/create-react-app/issues/186
      isEnvDevelopment &&
        new WatchMissingNodeModulesPlugin(paths.appNodeModules),
      isEnvProduction &&
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: 'static/css/[name].[contenthash:8].css',
          chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
        }),
      // Generate an asset manifest file with the following content:
      // - "files" key: Mapping of all asset filenames to their corresponding
      //   output file so that tools can pick it up without having to parse
      //   `index.html`
      // - "entrypoints" key: Array of files which are included in `index.html`,
      //   can be used to reconstruct the HTML if necessary
      new WebpackManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath: paths.publicUrlOrPath,
        generate: (seed, files, entrypoints) => {
          const manifestFiles = files.reduce((manifest, file) => {
            manifest[file.name] = file.path;
            return manifest;
          }, seed);
          const entrypointFiles = entrypoints.main.filter(
            (fileName) => !fileName.endsWith('.map'),
          );

          return {
            files: manifestFiles,
            entrypoints: entrypointFiles,
          };
        },
      }),
      // Moment.js is an extremely popular library that bundles large locale files
      // by default due to how webpack interprets its code. This is a practical
      // solution that requires the user to opt into importing specific locales.
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      // You can remove this if you don't use Moment.js:
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
      // TypeScript type checking turned off for CI envs
      // https://github.com/jpmorganchase/modular/issues/605
      useTypeScript &&
        !isCI &&
        new ForkTsCheckerWebpackPlugin({
          async: isEnvDevelopment,
          typescript: {
            async: isEnvDevelopment,
            typescriptPath: resolve.sync('typescript', {
              basedir: paths.appNodeModules,
            }),
            configOverwrite: {
              compilerOptions: {
                sourceMap: isEnvProduction
                  ? shouldUseSourceMap
                  : isEnvDevelopment,
                skipLibCheck: true,
                inlineSourceMap: false,
                declarationMap: false,
                noEmit: true,
              },
            },
            context: paths.appPath,
            diagnosticOptions: {
              syntactic: true,
              semantic: true,
            },
            mode: 'write-references',
          },
          issue: {
            // This one is specifically to match during CI tests,
            // as micromatch doesn't match
            // '../cra-template-typescript/template/src/App.tsx'
            // otherwise.
            include: [
              { file: '../**/src/**/*.{ts,tsx}' },
              { file: '**/src/**/*.{ts,tsx}' },
            ],
            exclude: [
              { file: '**/src/**/__tests__/**' },
              { file: '**/src/**/?(*.){spec|test}.*' },
              { file: '**/src/setupProxy.*' },
              { file: '**/src/setupTests.*' },
            ],
          },
          logger: {
            infrastructure: 'silent',
          },
        }),
    ].filter(Boolean),
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false,
  };

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
        info(
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

function createExternalDependenciesMap(externalDependencies) {
  const externalCdnTemplate =
    process.env.EXTERNAL_CDN_TEMPLATE ||
    'https://cdn.skypack.dev/[name]@[version]';

  return Object.entries(externalDependencies).reduce(
    (acc, [name, version]) => ({
      ...acc,
      [name]: externalCdnTemplate
        .replace('[name]', name)
        .replace('[version]', version),
    }),
    {},
  );
}

const packageRegex =
  /^(@[a-z0-9-~][a-z0-9-._~]*)?\/?([a-z0-9-~][a-z0-9-._~]*)\/?(.*)/;
function parsePackageName(name) {
  const parsedName = packageRegex.exec(name);
  if (!parsedName) {
    return;
  }
  const [_, scope, module, submodule] = parsedName;
  const dependencyName = (scope ? `${scope}/` : '') + module;
  return { dependencyName, scope, module, submodule };
}

// Virtual entrypoint if we're starting a view - see https://github.com/webpack/webpack/issues/6437
function getVirtualTrampoline() {
  const string = `
  import ReactDOM from 'react-dom'
  import React from 'react';
  import Component from './src/index.tsx';
  const DOMRoot = document.getElementById('root');
  ReactDOM.render(React.createElement(Component, null), DOMRoot);
	`;

  const base64 = Buffer.from(string).toString('base64');
  return `./src/_trampoline.js!=!data:text/javascript;base64,${base64}`;
}
