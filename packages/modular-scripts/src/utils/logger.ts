import isCI from 'is-ci';
import chalk from 'chalk';

const prefix = '[modular] ';

const DEBUG =
  process.env.MODULAR_LOGGER_DEBUG || process.argv.includes('--verbose');
const SILENT = process.env.MODULAR_LOGGER_MUTE;
const isInteractive = process.stdout.isTTY;

function printStdErr(x: string) {
  if (SILENT) {
    return;
  }
  x.split('\n').forEach((l) => {
    process.stderr.write(chalk.dim(prefix) + l + '\n');
  });
}

function printStdOut(x: string) {
  if (SILENT) {
    return;
  }
  x.split('\n').forEach((l) => {
    process.stdout.write(chalk.dim(prefix) + l + '\n');
  });
}
export function log(...x: string[]): void {
  printStdOut(x.join(' '));
}
export function warn(...x: string[]): void {
  printStdErr(chalk.yellow(x.join(' ')));
}
export function error(...x: string[]): void {
  printStdErr(chalk.red(x.join(' ')));
}

export function debug(...x: string[]): void {
  if (DEBUG) {
    log('[debug]', ...x);
  }
}

export function clear(): void {
  // if we're in CI then we'll always want to keep logs for whatever we're doing.
  if (!isCI && isInteractive && !DEBUG) {
    process.stdout.write(
      process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H',
    );
  }
}
