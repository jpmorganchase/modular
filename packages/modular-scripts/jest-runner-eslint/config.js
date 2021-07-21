'use strict';

const esLintCLIConfig = {
  cache: true,
  maxWarnings: 0,
  fix: process.env.MODULAR_LINT_FIX
    ? process.env.MODULAR_LINT_FIX.toLowerCase() === 'true'
    : false,
};

module.exports = () => esLintCLIConfig;
