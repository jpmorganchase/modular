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

      // perspective (https://perspective.finos.org/) is so useful
      // and widely used for us (JPM) that it makes sense to install
      // their webpack plugin by default. In the future, if
      // perspective provides a build that works by default, or if
      // there's any other workaround, we could remove this.
      // Of note; this doesn't include perspective itself in your app.

      try {
        // test whether `@finos/perspective` has been installed.
        // This is needed because the plugin imports from `@finos/perspective`
        // and would crash if imported when `@finos/perspective` isn't installed
        require.resolve('@finos/perspective');
        try {
          require.resolve('@finos/perspective-webpack-plugin');
        } catch (err) {
          console.info(
            "It appears you're using `@finos/perspective`. Run `yarn install @finos/perspective-webpack-plugin`, and modular will automatically optimise its bundling to be more efficient as described in https://github.com/finos/perspective/tree/master/packages/perspective-webpack-plugin.",
          );
          throw err;
        }
        // both perspective and its webpack plugin are available, let's
        // add it to our webpack pipeline.
        const PerspectivePlugin = require('@finos/perspective-webpack-plugin');
        webpackConfig.plugins.push(new PerspectivePlugin());
      } catch (err) {
        /* silently fail */
      }

      return webpackConfig;
    },
  },
  jest: {
    configure(jestConfig) {
      const options = {
        loaders: {
          '.js': 'jsx',
          '.test.js': 'jsx',
          '.ts': 'tsx',
          '.test.ts': 'tsx',
        },
      };

      const transform = { ...jestConfig.transform };

      // Replace babel transform with esbuild
      // babelTransform is first transformer key
      /* 
      transform:
        {
          '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$': 'node_modules\\react-scripts\\config\\jest\\babelTransform.js',
          '^.+\\.css$': 'node_modules\\react-scripts\\config\\jest\\cssTransform.js',
          '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)': 'node_modules\\react-scripts\\config\\jest\\fileTransform.js'
        }
      */
      const babelKey = Object.keys(transform)[0];

      // We replace babelTransform and add loaders to esbuild-jest
      transform[babelKey] = [require.resolve('esbuild-jest'), options];

      // Adds loader to all other transform options (2 in this case: cssTransform and fileTransform)
      // Reason for this is esbuild-jest plugin. It considers only loaders or other options from the last transformer
      // You can see it for yourself in: /node_modules/esbuild-jest/esbuid-jest.js:21 getOptions method
      // also in process method line 32 gives empty loaders, because options is already empty object
      // Issue reported here: https://github.com/aelbore/esbuild-jest/issues/18
      Object.keys(transform).forEach((key) => {
        if (babelKey === key) return; // ebuild-jest transform, already has loader

        // Checks if value is array, usually it's not
        // Our example is above on 70-72 lines. Usually default is: {"\\.[jt]sx?$": "babel-jest"}
        // (https://jestjs.io/docs/en/configuration#transform-objectstring-pathtotransformer--pathtotransformer-object)
        // But we have to cover all the cases
        if (Array.isArray(transform[key]) && transform[key].length === 1) {
          transform[key].push(options);
        } else {
          transform[key] = [transform[key], options];
        }
      });

      return {
        ...jestConfig,
        rootDir: absolutePackagesPath,
        roots: ['<rootDir>'],
        testMatch: ['<rootDir>/**/src/**/*.{spec,test}.{js,ts,tsx}'],
        coverageDirectory: path.resolve(modularRoot, 'coverage'),
        transform,
        collectCoverageFrom: [
          '<rootDir>/**/src/**/*.{js,ts,tsx}',
          '!**/*.d.ts',
        ],
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
