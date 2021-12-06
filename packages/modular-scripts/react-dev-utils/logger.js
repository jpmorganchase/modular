'use strict';

const isCI = require('is-ci');
const chalk = require('chalk');

const PREFIX = '[modular] ';

const DEBUG =
  process.env.MODULAR_LOGGER_DEBUG || process.argv.includes('--verbose');
const SILENT = process.env.MODULAR_LOGGER_MUTE;
const isInteractive = process.stdout.isTTY;

function printStdErr(x) {
  if (SILENT) {
    return;
  }
  x.split(/\r?\n/).forEach((l) => {
    process.stderr.write(chalk.dim(PREFIX) + l + '\n');
  });
}

function printStdOut(x, prefix = '') {
  if (SILENT) {
    return;
  }
  x.split('\n').forEach((l) => {
    process.stdout.write(chalk.dim(PREFIX) + prefix + l + '\n');
  });
}
module.exports.log = function log(...x) {
  printStdOut(x.join(' '));
};
module.exports.warn = function warn(...x) {
  printStdErr(chalk.yellow(x.join(' ')));
};
module.exports.error = function error(...x) {
  printStdErr(chalk.red(x.join(' ')));
};

module.exports.debug = function debug(...x) {
  if (DEBUG) {
    printStdOut(x.join(' '), chalk.blue('[debug] '));
  }
};

module.exports.clearConsole = function clear() {
  // if we're in CI then we'll always want to keep logs for whatever we're doing.
  if (!isCI && isInteractive && !DEBUG) {
    process.stdout.write(
      process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H',
    );
  }
};
