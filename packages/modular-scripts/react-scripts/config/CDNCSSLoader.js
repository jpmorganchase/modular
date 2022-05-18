'use strict';

module.exports = function externalCSSLoader(...args) {
  console.log(this);
  return 'console.log("Hello, I am a placeholder for external CSS")';
};
