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
  const { info, dependencyMap } = this.getOptions();
  const { descriptionData } = info;
  const dependency = dependencyMap[descriptionData.name];

  if (dependency) {
    // The submodule bit is the relative path in the resolver data. Use URL to normalize paths.
    const submodule = this._module.resourceResolveData.relativePath;
    const dependencyPath = new URL(dependency).pathname;
    const dependencyUrl = submodule
      ? new URL(`${dependencyPath}/${submodule}`, dependency).href
      : dependency;
    return generateStyleInjector(dependencyUrl);
  }
};

function generateStyleInjector(url) {
  return `
  const link = document.createElement('link');
  link.rel = 'stylesheet'; 
  link.type = 'text/css';
  link.href = '${url}'; 
  document.getElementsByTagName('HEAD')[0].appendChild(link); 
  `;
}
