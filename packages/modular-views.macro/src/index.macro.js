const fs = require('fs-extra');
const path = require('path');
const getModularRoot = require('./getModularRoot');
const { createMacro } = require('babel-plugin-macros');

// Given a directory of views, generate a map like:
// { 'package-name': lazy(() => import('package-name')) }
function generateViewMap(viewsDirectoryPath) {
  const packageNames = fs
    .readdirSync(viewsDirectoryPath, { withFileTypes: true })
    // Get individual view directories.
    .filter((entry) => entry.isDirectory())
    // Get view `package.json`s.
    .map((dir) =>
      fs.readJSONSync(path.join(viewsDirectoryPath, dir.name, 'package.json')),
    )
    .filter(
      (packageJson) =>
        // only chose the ones explicitly marked as views
        packageJson.modular?.type === 'view' &&
        // Remove views which are marked as private (and therefore are not published yet.)
        packageJson.private !== true,
    )
    // Get package names.
    .map((packageJson) => packageJson.name);

  return `(() => ({
  ${packageNames
    .map(
      (packageName) => `'${packageName}': lazy(() => import('${packageName}'))`,
    )
    .join(',\n  ')}
}))`;
}

function views({ references, babel }) {
  // eslint-disable-next-line
  const { types: t } = babel;
  // TODO: add a react import
  references.default.forEach((ref) => {
    ref.replaceWithSourceString(
      generateViewMap(path.join(getModularRoot(), 'packages')),
    );
  });
}

module.exports = createMacro(views);
