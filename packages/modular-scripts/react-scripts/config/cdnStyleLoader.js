'use strict';
const path = require('path');

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
    console.log({ info, dependency, context: this.context });
    // The submodule bit is the relative path between the location of the module and the resolved path
    const submodule = path.relative(this.context, info.realResource);
    const dependencyUrl = `${dependency}${submodule ? `/${submodule}` : ''}`;
    console.log(`Rewriting css import to ${dependencyUrl}`);
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
