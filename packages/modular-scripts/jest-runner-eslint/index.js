'use strict';

const { createJestRunner } = require('create-jest-runner');
const getConfig = require('./config');

const runner = createJestRunner(
  require.resolve('jest-runner-eslint/build/runner/runESLint'),
  {
    getExtraOptions: getConfig,
  },
);

module.exports = runner;
