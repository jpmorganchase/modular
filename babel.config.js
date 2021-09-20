// We're only using this file for builds right now.
// It'll go away once we self host builds as well.

'use strict';

const semver = require('semver');
const pkgJson = require('./package.json');

// Copied from https://github.com/facebook/jest/blob/56782b9/babel.config.js#L11
const supportedNodeVersion = semver.minVersion(pkgJson.engines.node).version;

module.exports = (api) => {
  api.cache(true);

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: supportedNodeVersion,
          },
        },
      ],
      '@babel/preset-react',
    ],
    plugins: [
      ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
    ],
    overrides: [
      {
        test: /\.tsx?$/,
        presets: ['@babel/preset-typescript'],
      },
    ],
  };
};
