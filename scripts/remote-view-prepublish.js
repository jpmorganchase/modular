'use strict';

const { writeFileSync } = require('fs');
const { resolve } = require('path');

/**
 * Removes the `publishConfig` block from a built Modular package.
 * This expects the build output to have been copied to `packages/<dir>/dist`.
 *
 * Mainly used by RemoteView.
 */

const DIRS_TO_PREPARE = ['remote-view'];

function writeNewPackageJson(src, content) {
  writeFileSync(src, JSON.stringify(content, null, 2));
}

function removePublishConfig(src) {
  const { publishConfig, ...pkg } = require(src);

  return {
    ...pkg,
  };
}

DIRS_TO_PREPARE.forEach((dirName) => {
  const src = resolve(
    __dirname,
    `../packages/${dirName}`,
    'dist',
    'package.json',
  );
  const content = removePublishConfig(src);
  writeNewPackageJson(src, content);
  console.log(
    `Package at dir packages/${dirName}/dist was updated to remove publishConfig`,
  );
});
