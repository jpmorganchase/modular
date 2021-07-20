import chalk from 'chalk';

const prefix = '[modular] ';

const DEBUG = process.env.MODULAR_LOGGER_DEBUG;
const SILENT = process.env.MODULAR_LOGGER_MUTE;

function print(x: string) {
  if (SILENT) {
    return;
  }
  x.split('\n').forEach((l) => {
    process.stderr.write(chalk.dim(prefix) + l + '\n');
  });
}
export function log(...x: string[]): void {
  print(x.join(' '));
}
export function warn(...x: string[]): void {
  print(chalk.yellow(x.join(' ')));
}
export function error(...x: string[]): void {
  print(chalk.red(x.join(' ')));
}

export function debug(...x: string[]): void {
  if (DEBUG) {
    log(...x);
  }
}
