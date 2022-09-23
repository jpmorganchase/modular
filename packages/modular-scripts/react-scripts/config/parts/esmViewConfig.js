'use strict';
const { parsePackageName } = require('../utils/esmUtils');

function createConfig({ dependencyMap }) {
  return {
    externals: createExternalRewriter(dependencyMap),
    externalsType: 'module',
    experiments: { outputModule: true },
    output: {
      module: true,
      library: { type: 'module' },
    },
  };
}

function createExternalRewriter(dependencyMap) {
  return function rewriteExternals({ request }, callback) {
    const parsedModule = parsePackageName(request);

    // If the module is absolute and it is in the import map, we want to externalise it
    if (
      parsedModule &&
      parsedModule.dependencyName &&
      dependencyMap[parsedModule.dependencyName] &&
      // If this is an absolute export of css we need to deal with it in the loader
      !request.endsWith('.css')
    ) {
      const { dependencyName, submodule } = parsedModule;

      const toRewrite = `${dependencyMap[dependencyName]}${
        submodule ? `/${submodule}` : ''
      }`;

      return callback(null, toRewrite);
    }
    // Otherwise we just want to bundle it
    return callback();
  };
}

module.exports = { createConfig };
