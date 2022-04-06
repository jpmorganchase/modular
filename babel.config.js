// We're only using this file for builds right now.
// It'll go away once we self host builds as well.

'use strict';

module.exports = (api) => {
  api.cache(true);

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: '14',
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
