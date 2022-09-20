'use strict';

const { writeFileSync } = require('fs');
const { resolve } = require('path');

// This script applies the contents of any `extendedPublishConfig` blocks
// to the root package.json of affected packages in PACKAGES_TO_EXTEND.
//
// It also removes `scripts` on the assumption none are needed when installing npm libraries.

const PACKAGES_TO_EXTEND = ['workspace-resolver'];

function writeNewPackageJson(src, content) {
  writeFileSync(src, JSON.stringify(content, null, 2));
}

function updatePackageJson(src) {
  const { extendedPublishConfig, scripts, ...pkg } = require(src);

  return {
    ...pkg,
    ...extendedPublishConfig,
  };
}

PACKAGES_TO_EXTEND.forEach((dirName) => {
  const src = resolve(__dirname, `../packages/${dirName}`, 'package.json');
  const content = updatePackageJson(src);
  writeNewPackageJson(src, content);
});
