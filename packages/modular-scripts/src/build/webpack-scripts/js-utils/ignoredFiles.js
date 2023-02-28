'use strict';

const path = require('path');
const escape = require('escape-string-regexp');

module.exports = function ignoredFiles(appSrc) {
  return new RegExp(
    `^(?!${escape(
      path.normalize(appSrc + '/').replace(/[\\]+/g, '/'),
    )}).+/node_modules/`,
    'g',
  );
};
