const fs = require('fs-extra');
const path = require('path');
const findUp = require('find-up');
const { createMacro } = require('babel-plugin-macros');

const modularRoot = path.dirname(
  findUp.sync((directory) => {
    const packageJsonPath = path.join(directory, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkgJSON = fs.readJsonSync(packageJsonPath);
      if (pkgJSON.modular && pkgJSON.modular.type === 'root') {
        return packageJsonPath;
      }
    }
    return;
  }),
);

if (!modularRoot) {
  throw new Error('This macro can only be used inside a modular project.');
}

const viewsDirectoryPath = path.join(modularRoot, 'packages');

const packageNames = [];
for (const entry of fs.readdirSync(viewsDirectoryPath, {
  withFileTypes: true,
})) {
  if (entry.isDirectory()) {
    const pkgJsonPath = path.join(
      viewsDirectoryPath,
      entry.name,
      'package.json',
    );
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = fs.readJSONSync(pkgJsonPath);
      if (
        pkgJson &&
        pkgJson.private !== true &&
        pkgJson.modular &&
        pkgJson.modular.type === 'view'
      ) {
        packageNames.push(entry.name);
      }
    }
  }
}

const viewsMap = `({
  ${packageNames
    .map(
      (packageName) =>
        `'${packageName}': __lazy__(() => import('${packageName}'))`,
    )
    .join(',\n  ')}
})`;

function views({ references, babel }) {
  if (references.default.length > 1) {
    throw new Error(
      'Do not use modular-views.macro more than once in a module, it will bloat your bundle size.',
    );
    // TODO: would be nice if we could restrict it to only one usage per _program_.
  }

  references.default.forEach((ref) => ref.replaceWithSourceString(viewsMap));

  if (references.default.length > 0 && packageNames.length > 0) {
    references.default[0].hub.file.path.node.body.unshift(
      babel.template.ast("import {lazy as __lazy__} from 'react';"),
    );
  }
}

module.exports = createMacro(views);
