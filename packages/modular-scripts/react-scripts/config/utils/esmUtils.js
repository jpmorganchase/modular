'use strict';

const packageRegex =
  /^(@[a-z0-9-~][a-z0-9-._~]*)?\/?([a-z0-9-~][a-z0-9-._~]*)\/?(.*)/;

function parsePackageName(name) {
  const parsedName = packageRegex.exec(name);
  if (!parsedName) {
    return;
  }
  const [, scope, module, submodule] = parsedName;
  const dependencyName = (scope ? `${scope}/` : '') + module;
  return { dependencyName, scope, module, submodule };
}

module.exports = {
  parsePackageName,
};
