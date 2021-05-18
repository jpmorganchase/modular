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
const glob = require('glob');

if (!process.env.MODULAR_ROOT) {
  throw new Error(
    // this should never be visible to a user, only us when we're developing
    'MODULAR_ROOT not found in environment, did you forget to pass it when calling cracoBin in cli.ts?',
  );
}

const modularRoot = process.env.MODULAR_ROOT;
const absolutePackagesPath = path.resolve(modularRoot, 'packages');
const absoluteModularGlobalConfigsPath = path.resolve(modularRoot, 'modular');

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
          use: ['@svgr/webpack'],
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
  jest: {
    configure(jestConfig) {
      return {
        ...jestConfig,
        resetMocks: false,
        transform: {
          '^.+\\.tsx?$': require.resolve('ts-jest'),
          '^.+\\.(css|scss)$': require.resolve('jest-transform-stub'),
          '.+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
            require.resolve('jest-transform-stub'),
        },
        testPathIgnorePatterns: ['/node_modules/', '/__integration__/'],
        rootDir: absolutePackagesPath,
        roots: ['<rootDir>'],
        testMatch: ['<rootDir>/**/src/**/*.{spec,test}.{js,ts,tsx}'],
        coverageDirectory: path.resolve(modularRoot, 'coverage'),
        collectCoverageFrom: [
          '<rootDir>/**/src/**/*.{js,ts,tsx}',
          '!**/*.d.ts',
        ],
        coveragePathIgnorePatterns: [
          '/__tests__/',
          '/node_modules/',
          'serviceWorker.ts',
        ],
        coverageThreshold: {
          global: {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
          },
        },
        setupFiles: jestConfig.setupFiles
          .concat([path.join(__dirname, './jest-setupEnvironment.js')])
          .concat(
            glob.sync(
              `${absoluteModularGlobalConfigsPath}/setupEnvironment.{js,ts,tsx}`,
              {
                cwd: process.cwd(),
              },
            ),
          ),
        setupFilesAfterEnv: glob.sync(
          `${absoluteModularGlobalConfigsPath}/setupTests.{js,ts,tsx}`,
          {
            cwd: process.cwd(),
          },
        ),
      };
    },
  },
};
