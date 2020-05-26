module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
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
