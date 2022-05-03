import browserslist from 'browserslist';
import chalk from 'chalk';
import * as os from 'os';

export const defaultBrowsers = {
  production: ['>0.2%', 'not dead', 'not op_mini all'],
  development: [
    'last 1 chrome version',
    'last 1 firefox version',
    'last 1 safari version',
  ],
};

export function checkBrowsers(dir: string): Promise<void> {
  const current = browserslist.loadConfig({ path: dir });
  if (current != null) {
    return Promise.resolve();
  } else {
    return Promise.reject(
      new Error(
        chalk.red('Modular requires that you specify targeted browsers.') +
          os.EOL +
          `Run ${chalk.blue('modular check --fix')} to autofix this.`,
      ),
    );
  }
}
