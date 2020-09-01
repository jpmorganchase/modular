'use strict';

const path = require('path');
const { getLoader, loaderByName } = require('@craco/craco');

const absolutePackagesPath = path.resolve('../../packages');

module.exports = {
  webpack: {
    // todo: entry should read from cli args
    // todo: entry could have multiple entries (https://webpack.js.org/concepts/entry-points/)

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
    configure: {
      roots: ['<rootDir>/../../packages/'],
      testMatch: [
        '<rootDir>/../../packages/**/__tests__/**/*.{js,ts,tsx}',
        '<rootDir>/../../packages/**/*.{spec,test}.{js,ts,tsx}',
      ],
    },
  },
};
