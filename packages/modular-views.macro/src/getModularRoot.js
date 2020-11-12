// keep this in sync with modular-scripts/src/getModularRoot
const path = require('path');
const fs = require('fs-extra');
const findUp = require('find-up');

function isModularRoot(packageJson) {
  return packageJson?.modular?.type === 'root';
}

function findUpModularRoot() {
  return findUp.sync((directory) => {
    const packageJsonPath = path.join(directory, 'package.json');
    if (
      findUp.sync.exists(packageJsonPath) &&
      isModularRoot(fs.readJsonSync(packageJsonPath))
    ) {
      return packageJsonPath;
    }
    return;
  });
}

module.exports = function getModularRoot() {
  try {
    const modularRoot = findUpModularRoot();
    if (modularRoot === undefined) {
      console.error('These commands must be run within a modular repository.');
      process.exit(1);
    }

    return path.dirname(modularRoot);
  } catch (err) {
    console.error(err);
    return process.exit(1);
  }
};
