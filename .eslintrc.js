'use strict';

// Short hand codes for the values eslint expects
// Might feel like overkill, but is also effectively visually
// when scanning through the config and looking for values.

// eslint-disable-next-line  no-unused-vars
const ERROR = 'error';
const WARN = 'warn';
const OFF = 'off';

module.exports = {
  extends: ['modular-app'],
  rules: {
    strict: [WARN, 'global'],
    'import/no-extraneous-dependencies': ['error', { devDependencies: false }],
  },
  overrides: [
    {
      files: ['**/*.test.*', '**/__tests__/**'],
      rules: {
        'import/no-extraneous-dependencies': OFF,
      },
    },
    {
      files: 'packages/modular-scripts/types/**/*',
      rules: {
        'react/jsx-pascal-case': OFF,
      },
    },
    {
      // if we want to use js in this repo, then they have
      // to be explitly marked as modules
      files: '**/*.js',
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
};
