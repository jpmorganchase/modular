const { createJestConfig } = require('@craco/craco');
const cracoConfig = require('./craco.config.js');

module.exports = createJestConfig(cracoConfig);
