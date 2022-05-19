'use strict';
module.exports = function CDNAssetLoader(asset) {
  // noop
  return asset;
};

module.exports.pitch = function (remainingRequest, precedingRequest, data) {
  const { info, dependencyMap } = this.getOptions();
  const { descriptionData } = info;
  const dependency = dependencyMap[descriptionData.name];

  if (dependency) {
    console.log({ descriptionData, dependency });
    console.log('pitching returned');
    return `console.log('This is placeholder code for dependency ${descriptionData.name}')`;
  }
};
