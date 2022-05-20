'use strict';
const path = require('path');
module.exports = function CDNAssetLoader(asset) {
  // noop. Just return the translated asset if the pitching doesn't return (and the chain is processed)
  return asset;
};

module.exports.pitch = function () {
  const { info, dependencyMap } = this.getOptions();
  const { descriptionData } = info;
  const dependency = dependencyMap[descriptionData.name];

  if (dependency) {
    console.log({ info, dependency, context: this.context });
    console.log('pitching returned');
    // The submodule bit is the relative path between the location of the module and the resolved path
    const submodulePath = path.relative(this.context, info.realResource);
    console.log(
      `This is placeholder code for dependency ${descriptionData.name}/${submodulePath}`,
    );
    return `console.log('This is placeholder code for dependency ${descriptionData.name}/${submodulePath}')`;
  }
};
