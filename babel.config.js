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
    overrides: [
      {
        test: /\.tsx?$/,
        presets: ['@babel/preset-typescript'],
      },
    ],
  };
};
