import HtmlWebpackPlugin from 'html-webpack-plugin';
import InlineChunkHtmlPlugin from '../../../react-dev-utils/InlineChunkHtmlPlugin';
import InterpolateHtmlPlugin from '../../../react-dev-utils/InterpolateHtmlPlugin';
import webpack from 'webpack';
import { Paths } from '../../../utils/determineTargetPaths';

export function createAppConfig(): webpack.Configuration {
  return {
    optimization: {
      // Automatically split vendor and commons
      splitChunks: { chunks: 'all' },
      // Keep the runtime chunk separated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      // https://github.com/facebook/create-react-app/issues/5358
      runtimeChunk: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-explicit-any
        name: (entrypoint: { name: any }) => `runtime-${entrypoint.name}`,
      },
    },
  };
}

export function createAppPluginConfig(
  isEnvProduction: boolean,
  shouldInlineRuntimeChunk: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  env: any,
  paths: Paths,
): { plugins: webpack.WebpackPluginInstance[] } {
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
      ) as webpack.WebpackPluginInstance,
      // Inlines the webpack runtime script. This script is too small to warrant
      // a network request.
      // https://github.com/facebook/create-react-app/issues/5358
      isEnvProduction &&
        shouldInlineRuntimeChunk &&
        (new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [
          /runtime-.+[.]js/,
        ]) as webpack.WebpackPluginInstance),
      // Makes some environment variables available in index.html.
      // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
      // <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
      // It will be an empty string unless you specify "homepage"
      // in `package.json`, in which case it will be the pathname of that URL.
      new InterpolateHtmlPlugin(
        HtmlWebpackPlugin,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        env.raw,
      ) as webpack.WebpackPluginInstance,
    ].filter(Boolean) as webpack.WebpackPluginInstance[],
  };
}