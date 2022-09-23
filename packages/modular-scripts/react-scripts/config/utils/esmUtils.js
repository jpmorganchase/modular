'use strict';

const packageRegex =
  /^(@[a-z0-9-~][a-z0-9-._~]*)?\/?([a-z0-9-~][a-z0-9-._~]*)\/?(.*)/;

function parsePackageName(name) {
  const parsedName = packageRegex.exec(name);
  if (!parsedName) {
    return;
  }
  const [_, scope, module, submodule] = parsedName;
  const dependencyName = (scope ? `${scope}/` : '') + module;
  return { dependencyName, scope, module, submodule };
}

function createExternalDependenciesMap({
  externalDependencies,
  externalResolutions,
  selectiveCDNResolutions,
}) {
  const externalCdnTemplate =
    process.env.EXTERNAL_CDN_TEMPLATE ||
    'https://cdn.skypack.dev/[name]@[version]';

  return Object.entries(externalDependencies).reduce((acc, [name, version]) => {
    if (!externalResolutions[name]) {
      throw new Error(
        `Dependency ${name} found in package.json but not in lockfile. Have you installed your dependencies?`,
      );
    }

    return {
      ...acc,
      [name]: externalCdnTemplate
        .replace('[name]', name)
        .replace('[version]', version || externalResolutions[name])
        .replace('[resolution]', externalResolutions[name])
        .replace(
          '[selectiveCDNResolutions]',
          selectiveCDNResolutions
            ? Object.entries(selectiveCDNResolutions)
                .map(([key, value]) => `${key}@${value}`)
                .join(',')
            : '',
        ),
    };
  }, {});
}

module.exports = {
  createExternalDependenciesMap,
  parsePackageName,
};
