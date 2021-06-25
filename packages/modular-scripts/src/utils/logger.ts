import chalk from 'chalk';

/* eslint-disable @typescript-eslint/no-explicit-any */

const prefix = '[modular] ';

const DEBUG = process.env.MODULAR_LOGGER_DEBUG;
const SILENT = process.env.MODULAR_LOGGER_MUTE;

function print(x: string) {
  if (SILENT) {
    return;
  }
  process.stderr.write(chalk.dim(prefix) + x + '\n');
}
export function log(...x: any[]): void {
  print(x.join(' '));
}
export function warn(...x: any[]): void {
  print(chalk.yellow(x.join(' ')));
}
export function error(...x: any[]): void {
  print(chalk.red(x.join(' ')));
}

export function debug(...x: any[]): void {
  if (DEBUG) {
    print(x.join(' '));
  }
}
