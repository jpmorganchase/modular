'use strict';

const isCI = require('is-ci');

const DEBUG =
  process.env.MODULAR_LOGGER_DEBUG || process.argv.includes('--verbose');
const isInteractive = process.stdout.isTTY;

function clearConsole() {
  if (!isCI && isInteractive && !DEBUG) {
    process.stdout.write(
      process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H',
    );
  }
}

module.exports = clearConsole;
