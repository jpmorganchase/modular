import builtinModules from 'builtin-modules';
import TerserPlugin from 'terser-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import ModuleScopePlugin from '../../utils/ModuleScopePlugin';
import getCSSModuleLocalIdent from '../../utils/getCSSModuleLocalIdent';
import createStyleLoadersConfig from './styleLoadersConfig';
import { Paths } from '../../../common-scripts/determineTargetPaths';
import { Modules } from '../modules';
import webpack from 'webpack';
const reactRefreshOverlayEntry = require.resolve(
  '../../utils/refreshOverlayInterop',
);
const PnpWebpackPlugin = require('pnp-webpack-plugin');

// style files regexes
const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;
const sassRegex = /\.(scss|sass)$/;
const sassModuleRegex = /\.module\.(scss|sass)$/;

export default function createBaseConfig(
  isEnvProduction: boolean,
  isApp: boolean,
  paths: Paths,
  useTypeScript: boolean,
  isEnvProductionProfile: boolean,
  imageInlineSizeLimit: number,
  modules: Modules,
  shouldUseSourceMap: boolean,
  esbuildTargetFactory: string[],
  dependencyMap: Map<string, string>,
): webpack.Configuration {
  const isEnvDevelopment = !isEnvProduction;
  const isEsmView = !isApp;
  return {
    context: paths.appPath,
    // Workaround for this bug: https://stackoverflow.com/questions/53905253/cant-set-up-the-hmr-stuck-with-waiting-for-update-signal-from-wds-in-cons
    target: 'web',
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    // We bundle a virtual file to trampoline the ESM view as an entry point if we're starting it (ESM views have no ReactDOM.render)
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
      fallback: builtinModules.reduce((acc: any, next) => {
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
              include: paths.includeDirectories,
              loader: require.resolve('esbuild-loader'),
              options: {
                implementation: require('esbuild'),
                loader: 'tsx',
                target: esbuildTargetFactory,
              },
            },
            {
              test: /\.ts$/,
              include: paths.includeDirectories,
              loader: require.resolve('esbuild-loader'),
              options: {
                implementation: require('esbuild'),
                loader: 'ts',
                target: esbuildTargetFactory,
              },
            },
            {
              test: /\.tsx$/,
              include: paths.includeDirectories,
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
              use: createStyleLoadersConfig({
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
                paths,
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
              use: createStyleLoadersConfig({
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
                paths,
              }),
            },
            // Opt-in support for SASS (using .scss or .sass extensions).
            // By default we support SASS Modules with the
            // extensions .module.scss or .module.sass
            {
              test: sassRegex,
              exclude: sassModuleRegex,
              use: createStyleLoadersConfig({
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
                paths,
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
              use: createStyleLoadersConfig({
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
                paths,
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
              ecma: 2017,
            },
            compress: {
              ecma: 5,
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
  };
}
