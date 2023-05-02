'use strict';
// This is a pitching loader, which means that it will exclude other loaders if its pitch method returns.
// pitch methods are evaluated left to right and the correspondent default methods are evaluated later, right to left
// For this reason, this loader must be first in the chain of other style loaders.
// It will just set the output and interrupt if pitch returns and it will just act as a bypass of the chain output otherwise
// If it existed another method of redirecting an external to a loader, it'd be simpler to just get rid of these pitch restrictions

module.exports = function cdnStyleLoader(asset) {
  // noop. Just return the translated asset if the pitching doesn't return (and the chain is processed)
  return asset;
};

module.exports.pitch = function () {
  const { info, importSet } = this.getOptions();
  const { descriptionData } = info;

  // Rewrite to noop placeholder: dependency will be written in output package.json
  // and generated index.html, no need to load it in the page
  if (importSet.has(descriptionData.name)) {
    return `/* Placeholder for ${descriptionData.name} - see package.json */`;
  }
};
