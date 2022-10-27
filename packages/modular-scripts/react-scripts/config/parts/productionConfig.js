'use strict';
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

function createConfig({ shouldUseSourceMap, paths }) {
  return {
    mode: 'production',
    // Stop compilation early in production
    bail: true,
    devtool: shouldUseSourceMap ? 'source-map' : false,
    output: {
      // The build folder.
      path: paths.appBuild,
      pathinfo: false,
      // There will be one main bundle, and one file per asynchronous chunk.
      filename: 'static/js/[name].[contenthash:8].js',
      // There are also additional JS chunk files if you use code splitting.
      // Please remember that Webpack 5, unlike Webpack 4, controls "splitChunks" via fileName, not chunkFilename - https://stackoverflow.com/questions/66077740/webpack-5-output-chunkfilename-not-working
      chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: (info) =>
        path
          .relative(paths.appSrc, info.absoluteResourcePath)
          .replace(/\\/g, '/'),
    },
    optimization: {
      minimize: true,
    },
  };
}

function createPluginConfig() {
  return {
    plugins: [
      new MiniCssExtractPlugin({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: 'static/css/[name].[contenthash:8].css',
        chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
      }),
    ].filter(Boolean),
  };
}

module.exports = { createConfig, createPluginConfig };
