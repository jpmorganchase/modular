'use strict';

// This file is based on https://github.com/facebook/create-react-app/tree/main/packages/eslint-config-react-app

// Fix eslint shareable config (https://github.com/eslint/eslint/issues/3458)
require('@rushstack/eslint-patch/modern-module-resolution');

// This file contains the minimum ESLint configuration required for Create
// React App support, and is used as the `baseConfig` for `eslint-loader`
// to ensure that user-provided configs don't need this boilerplate.

module.exports = {
  root: true,

  parser: '@babel/eslint-parser',

  plugins: ['react'],

  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
    node: true,
  },

  parserOptions: {
    sourceType: 'module',
    requireConfigFile: false,
    babelOptions: {
      presets: [require.resolve('babel-preset-react-app/prod')],
    },
  },

  settings: {
    react: {
      version: 'detect',
    },
  },

  rules: {
    'react/jsx-uses-vars': 'warn',
    'react/jsx-uses-react': 'warn',
  },
};
