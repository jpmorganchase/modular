import webpack, { Configuration, WebpackPluginInstance } from 'webpack';
import resolve from 'resolve';
import isCI from 'is-ci';
import { merge } from 'webpack-merge';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import ModuleNotFoundPlugin from '../../plugins/ModuleNotFoundPlugin';
import { createEsmViewPluginConfig } from './esmViewConfig';
import { createAppPluginConfig } from './appConfig';
import { createDevelopmentPluginConfig } from './developmentConfig';
import { createProductionPluginConfig } from './productionConfig';
import getClientEnvironment from '../../../common-scripts/getClientEnvironment';
import type { Paths } from '../../../common-scripts/determineTargetPaths';

// Some apps do not need the benefits of saving a web request, so not inlining the chunk
// makes for a smoother build process.
const shouldInlineRuntimeChunk = process.env.INLINE_RUNTIME_CHUNK !== 'false';

// We will provide `paths.publicUrlOrPath` to our app
// as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
// Omit trailing slash as %PUBLIC_URL%/xyz looks better than %PUBLIC_URL%xyz.
// Get environment variables to inject into our app.

export default function createPluginConfig(
  isApp: boolean,
  isEnvProduction: boolean,
  shouldUseSourceMap: boolean,
  useTypeScript: boolean,
  styleImports: Set<string>,
  paths: Paths,
  indexPath: string | false,
): Configuration {
  const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));
  const isEnvDevelopment = !isEnvProduction;

  const basePlugins: Configuration = {
    plugins: [
      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(paths.appPath) as WebpackPluginInstance,
      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
      // It is absolutely essential that NODE_ENV is set to production
      // during a production build.
      // Otherwise React will be compiled in the very slow development mode.
      new webpack.DefinePlugin(env.stringified) as WebpackPluginInstance,
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
      }) as unknown as WebpackPluginInstance,
      // Moment.js is an extremely popular library that bundles large locale files
      // by default due to how webpack interprets its code. This is a practical
      // solution that requires the user to opt into importing specific locales.
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      // You can remove this if you don't use Moment.js:
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }) as WebpackPluginInstance,
      // TypeScript type checking turned off for CI envs
      // https://github.com/jpmorganchase/modular/issues/605
      useTypeScript &&
        !isCI &&
        (new ForkTsCheckerWebpackPlugin({
          async: isEnvDevelopment,
          typescript: {
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
        }) as WebpackPluginInstance),
    ].filter(Boolean) as WebpackPluginInstance[],
  };

  return merge([
    isApp
      ? createAppPluginConfig(
          isEnvProduction,
          shouldInlineRuntimeChunk,
          env,
          paths,
        )
      : createEsmViewPluginConfig(isEnvProduction, styleImports, indexPath),
    isEnvProduction
      ? createProductionPluginConfig()
      : createDevelopmentPluginConfig(paths),
    basePlugins,
  ]);
}
