'use strict';

const resolveAsBin = require('resolve-as-bin');
const path = require('path');
const { createJestConfig } = require('@craco/craco');

const packagesRoot = 'packages';
const outputDirectory = 'dist';

const cracoBin = resolveAsBin('craco');
const cracoConfig = path.join(
  __dirname,
  '..',
  '..',
  'DO_NOT_IMPORT_THIS_OR_YOU_WILL_BE_FIRED_craco.config.js',
);

function getCracoJestConfig() {
  return createJestConfig(require(cracoConfig));
}

module.exports = {
  getCracoJestConfig,
  cracoConfig,
  cracoBin,
  packagesRoot,
  outputDirectory,
};
