'use strict';

const diff = require('jest-diff');
const { inspect } = require('util');
const createConfigOld = require('./webpack.config.old');
const createConfigNew = require('./webpack.config');
const { exit } = require('process');

let oldConfig;
let newConfig;

/* Invoke with:

- MODULAR_IS_APP="true" MODULAR_ROOT="/Users/n761472/dev/modular" MODULAR_PACKAGE="modular-scripts" MODULAR_PACKAGE_NAME="modular-scripts" node packages/modular-scripts/react-scripts/config/config_test.js
- MODULAR_IS_APP="false" MODULAR_PACKAGE_DEPS="{\"externalDependencies\": {\"react\": \"17.0.1\"}}" MODULAR_PACKAGE_RESOLUTIONS="{\"externalResolutions\": {\"react\": \"17.0.1\"}}" MODULAR_ROOT="/Users/n761472/dev/modular" MODULAR_PACKAGE="modular-scripts" MODULAR_PACKAGE_NAME="modular-scripts" node packages/modular-scripts/react-scripts/config/config_test.js

*/

// console.log('Test 1: development');

// oldConfig = createConfigOld('development');
// newConfig = createConfigNew('development');

// if (stringify(oldConfig) !== stringify(newConfig)) {
//   console.log(diff);
//   console.log(diff.default(oldConfig, newConfig));
//   exit(-1);
// }

// function stringify(obj) {
//   return inspect(obj, { showHidden: true, depth: null });
// }

console.log('Test 2: production');

oldConfig = createConfigOld('production');
newConfig = createConfigNew('production');

if (stringify(oldConfig) !== stringify(newConfig)) {
  console.log(diff);
  console.log(diff.default(oldConfig, newConfig));
  exit(-1);
}

function stringify(obj) {
  return inspect(obj, { showHidden: true, depth: null });
}
