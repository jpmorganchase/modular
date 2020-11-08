'use strict';

const path = require('path');
const { getLoader, loaderByName } = require('@craco/craco');
const globby = require('globby');

const { getModularRoot } = require('.');

const modularRoot = getModularRoot();
const absolutePackagesPath = path.resolve(modularRoot, 'packages');
const absoluteModularGlobalConfigsPath = path.resolve(modularRoot, 'modular');

module.exports = {
  // disabling eslint until https://github.com/gsoft-inc/craco/issues/205 is resolved
  eslint: {
    enable: false,
  },
  plugins: [
    {
      plugin: {
        overrideCracoConfig: ({ cracoConfig }) => {
          if (typeof cracoConfig.eslint.enable !== 'undefined') {
            cracoConfig.disableEslint = !cracoConfig.eslint.enable;
          }
          delete cracoConfig.eslint;
          return cracoConfig;
        },
        overrideWebpackConfig: ({ webpackConfig, cracoConfig }) => {
          if (
            typeof cracoConfig.disableEslint !== 'undefined' &&
            cracoConfig.disableEslint === true
          ) {
            webpackConfig.plugins = webpackConfig.plugins.filter(
              (instance) => instance.constructor.name !== 'ESLintWebpackPlugin',
            );
          }
          return webpackConfig;
        },
      },
    },
  ],
  // end disable eslint config

  webpack: {
    configure(webpackConfig) {
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

      return webpackConfig;
    },
  },
  jest: {
    configure(jestConfig) {
      const perPackageSetupTests = globby.sync(
        [`${absolutePackagesPath}/*/src/setupTests.{js,ts,tsx}`],
        { cwd: process.cwd() },
      );
      if (perPackageSetupTests.length) {
        console.warn(
          "A setupTests file was found within an app's `src/` directory:",
          perPackageSetupTests.join(', '),
        );
        console.warn(
          'Modular projects should store all test setup at the root of the project (e.g. `modular/setupTests.{js,ts,tsx}`).',
        );
      }

      return {
        ...jestConfig,
        rootDir: absolutePackagesPath,
        roots: ['<rootDir>'],
        testMatch: [
          '<rootDir>/*/src/**/__tests__/**/*.{js,ts,tsx}',
          '<rootDir>/*/src/**/*.{spec,test}.{js,ts,tsx}',
        ],
        coverageDirectory: path.resolve(modularRoot, 'coverage'),
        collectCoverageFrom: ['<rootDir>/*/src/**/*.{js,ts,tsx}', '!**/*.d.ts'],
        setupFilesAfterEnv: globby.sync(
          [`${absoluteModularGlobalConfigsPath}/setupTests.{js,ts,tsx}`],
          {
            cwd: process.cwd(),
          },
        ),
      };
    },
  },
};
