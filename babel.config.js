const semver = require('semver');
const pkgJson = require('./package.json');

// Copied from https://github.com/facebook/jest/blob/56782b9/babel.config.js#L11
const supportedNodeVersion = semver.minVersion(pkgJson.engines.node).version;

module.exports = (api) => {
  const env = api.env();

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: env === 'test' ? 'current' : supportedNodeVersion,
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
