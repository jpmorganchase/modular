'use strict';

const modules = require('../modules');

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

modules.exports = {
  createExternalDependenciesMap,
};
