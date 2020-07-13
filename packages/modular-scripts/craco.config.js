'use strict';

const path = require('path');
const { getLoader, loaderByName } = require('@craco/craco');

const absolutePath = path.resolve('../widgets');

module.exports = {
  webpack: {
    alias: {},
    plugins: [],
    configure(webpackConfig) {
      const { isFound, match } = getLoader(
        webpackConfig,
        loaderByName('babel-loader'),
      );

      if (isFound) {
        const include = Array.isArray(match.loader.include)
          ? match.loader.include
          : [match.loader.include];
        match.loader.include = include.concat(absolutePath);
      }

      return webpackConfig;
    },
  },
  jest: {
    configure: {
      roots: ['<rootDir>/../app', '<rootDir>/../widgets/'],
      testMatch: [
        '<rootDir>/../app/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/../app/**/*.{spec,test}.{js,jsx,ts,tsx}',
        '<rootDir>/../widgets/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/../widgets/**/*.{spec,test}.{js,jsx,ts,tsx}',
      ],
    },
  },
};
