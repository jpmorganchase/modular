import { ModularPackageJson } from './isModularType';
import browserslist from 'browserslist';
import chalk from 'chalk';
import * as os from 'os';
import prompts from 'prompts';
import * as fs from 'fs-extra';
import * as path from 'path';

import * as logger from './logger';
import getModularRoot from './getModularRoot';

export const defaultBrowsers = {
  production: ['>0.2%', 'not dead', 'not op_mini all'],
  development: [
    'last 1 chrome version',
    'last 1 firefox version',
    'last 1 safari version',
  ],
};

async function shouldSetBrowsers(): Promise<boolean> {
  if (process.stdout.isTTY) {
    const answer = await prompts({
      type: 'confirm',
      name: 'shouldSetBrowsers',
      message:
        chalk.yellow("We're unable to detect target browsers.") +
        `\n\nWould you like to add the defaults to your ${chalk.bold(
          'package.json',
        )}?`,
      initial: true,
    });

    return answer.shouldSetBrowsers as boolean;
  } else {
    return Promise.resolve(true);
  }
}

export async function checkBrowsers(dir: string, retry = true): Promise<void> {
  const current = browserslist.loadConfig({ path: dir });
  if (current != null) {
    return Promise.resolve();
  }

  if (retry) {
    const shouldUpdateBrowser = await shouldSetBrowsers();
    if (shouldUpdateBrowser) {
      logger.log(`Setting target browsers in modular root ${getModularRoot()}`);
      const filePath = path.join(getModularRoot(), 'package.json');

      const pkg = (await fs.readJson(filePath)) as ModularPackageJson;
      pkg['browserslist'] = defaultBrowsers;

      await fs.writeJson(filePath, pkg, { spaces: 2 });

      browserslist.clearCaches();

      logger.log();
      logger.log(
        `${chalk.green('Set target browsers:')} ${chalk.cyan(
          JSON.stringify(defaultBrowsers, null, 2),
        )}`,
      );
      logger.log();
    } else {
      return checkBrowsers(dir, false);
    }
  } else {
    return Promise.reject(
      new Error(
        chalk.red('Modular requires that you specify targeted browsers.') +
          os.EOL +
          `Please add a ${chalk.underline(
            'browserslist',
          )} key to your ${chalk.bold('package.json')}.`,
      ),
    );
  }
}
