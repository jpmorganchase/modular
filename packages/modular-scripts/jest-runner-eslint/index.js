'use strict';

const { createJestRunner } = require('create-jest-runner');

const runner = createJestRunner(
  require.resolve('jest-runner-eslint/build/runner/runESLint'),
  {
    getExtraOptions: () => ({
      cache: true,
      maxWarnings: 0,
      fix: process.env.MODULAR_LINT_FIX
        ? process.env.MODULAR_LINT_FIX.toLowerCase() === 'true'
        : false,
    }),
  },
);

module.exports = runner;
