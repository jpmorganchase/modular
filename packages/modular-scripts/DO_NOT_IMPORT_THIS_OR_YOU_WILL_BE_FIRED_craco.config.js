'use strict';

// If you need to modify this, talk to us! Maybe your change
// is good enough for everybody, or we have alternate workarounds.

const path = require('path');
const {
  getLoader,
  loaderByName,
  addAfterLoader,
  removeLoaders,
} = require('@craco/craco');

if (!process.env.MODULAR_ROOT) {
  throw new Error(
    // this should never be visible to a user, only us when we're developing
    'MODULAR_ROOT not found in environment, did you forget to pass it when calling cracoBin in cli.ts?',
  );
}

const modularRoot = process.env.MODULAR_ROOT;
const absolutePackagesPath = path.resolve(modularRoot, 'packages');

module.exports = {
  eslint: {
    enable: process.env.ENABLED_ESLINT || false,
  },
  webpack: {
    configure(webpackConfig, context) {
      if (process.env.USE_MODULAR_BABEL) {
        console.log('Falling back to babel-loader for builds.');
        const { isFound, match } = getLoader(
          webpackConfig,
          loaderByName('babel-loader'),
        );

        if (isFound) {
          const include = Array.isArray(match.loader.include)
            ? match.loader.include
            : [match.loader.include];
          match.loader.include = [...include, absolutePackagesPath];
        }
      } else {
        const paths = context.paths;

        /**
         * Enable the svgr plugin
         * svg will not be loaded as a file anymore
         */
        webpackConfig.module.rules.unshift({
          test: /\.svg$/,
          use: [require.resolve('@svgr/webpack')],
        });

        const include = [paths.appSrc, absolutePackagesPath];

        // add esbuild-loader
        addAfterLoader(webpackConfig, loaderByName('babel-loader'), {
          test: /\.(js|mjs|jsx|ts|tsx)$/,
          include,
          loader: require.resolve('esbuild-loader'),
          options: {
            implementation: require('esbuild'),
            loader: 'tsx',
            target: 'es2015',
          },
        });

        removeLoaders(webpackConfig, loaderByName('babel-loader'));
      }

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
            console.info(
              `It appears you're using ${dependency}. Run 'yarn add -D ${plugin.package}' to install`,
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
    },
  },
};
