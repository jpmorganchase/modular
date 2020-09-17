'use strict';

const path = require('path');
const { getLoader, loaderByName } = require('@craco/craco');
const globby = require('globby');

const { getModularRoot } = require('.');

const modularRoot = getModularRoot();
const absolutePackagesPath = path.resolve(modularRoot, 'packages');

module.exports = {
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
          [`${absolutePackagesPath}/**/src/setupTests.{js,ts}`],
          { cwd: process.cwd() },
        ),
      };
    },
  },
};
