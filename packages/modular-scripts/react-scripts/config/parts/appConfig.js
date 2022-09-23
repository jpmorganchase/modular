'use strict';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InlineChunkHtmlPlugin = require('../../../react-dev-utils/InlineChunkHtmlPlugin');
const InterpolateHtmlPlugin = require('../../../react-dev-utils/InterpolateHtmlPlugin');

function createConfig() {
  return {
    // TODO: remove me
    experiments: {
      outputModule: undefined,
    },
    externals: undefined,
    externalsType: undefined,
    output: {
      library: undefined,
      module: undefined,
      path: undefined,
    },
    // TODO: end remove
    optimization: {
      // Automatically split vendor and commons
      splitChunks: { chunks: 'all' },
      // Keep the runtime chunk separated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      // https://github.com/facebook/create-react-app/issues/5358
      runtimeChunk: {
        name: (entrypoint) => `runtime-${entrypoint.name}`,
      },
    },
  };
}

function createPluginConfig({
  isEnvProduction,
  shouldInlineRuntimeChunk,
  env,
  paths,
}) {
  return {
    plugins: [
      // Generates an `index.html` file with the <script> injected.
      new HtmlWebpackPlugin(
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
      ),
      // Inlines the webpack runtime script. This script is too small to warrant
      // a network request.
      // https://github.com/facebook/create-react-app/issues/5358
      isEnvProduction &&
        shouldInlineRuntimeChunk &&
        new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime-.+[.]js/]),
      // Makes some environment variables available in index.html.
      // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
      // <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
      // It will be an empty string unless you specify "homepage"
      // in `package.json`, in which case it will be the pathname of that URL.
      new InterpolateHtmlPlugin(HtmlWebpackPlugin, env.raw),
    ].filter(Boolean),
  };
}

module.exports = { createConfig, createPluginConfig };
