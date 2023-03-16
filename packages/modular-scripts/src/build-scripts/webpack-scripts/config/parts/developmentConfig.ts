import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin';
import WatchMissingNodeModulesPlugin from '../../plugins/WatchMissingNodeModulesPlugin';
import path from 'path';
import type { Paths } from '../../../common-scripts/determineTargetPaths';
import { WebpackConfiguration } from 'webpack-dev-server';
import {
  Configuration,
  WebpackPluginFunction,
  WebpackPluginInstance,
} from 'webpack';

export function createDevelopmentConfig(): WebpackConfiguration {
  return {
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
      devtoolModuleFilenameTemplate: (info: { absoluteResourcePath: string }) =>
        path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
    },
    optimization: {
      minimize: false,
    },
  };
}

export function createDevelopmentPluginConfig(paths: Paths): Configuration {
  return {
    plugins: [
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebook/create-react-app/issues/240
      new CaseSensitivePathsPlugin() as WebpackPluginFunction,
      // If you require a missing module and then `npm install` it, you still have
      // to restart the development server for webpack to discover it. This plugin
      // makes the discovery automatic so you don't have to restart.
      // See https://github.com/facebook/create-react-app/issues/186
      new WatchMissingNodeModulesPlugin(
        paths.appNodeModules,
      ) as WebpackPluginInstance,
    ].filter(Boolean),
  };
}
