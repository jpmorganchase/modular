import chalk from 'chalk';

const prefix = '[modular] ';

const DEBUG = process.env.MODULAR_LOGGER_DEBUG;
const SILENT = process.env.MODULAR_LOGGER_MUTE;

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
    log(...x);
  }
}
