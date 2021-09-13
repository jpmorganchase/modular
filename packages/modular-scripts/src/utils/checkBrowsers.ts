import { ModularPackageJson } from './isModularType';
import browserslist from 'browserslist';
import chalk from 'chalk';
import * as os from 'os';
import prompts from 'prompts';
import * as fs from 'fs-extra';
import pkgUp from 'pkg-up';

import * as logger from './logger';

export const defaultBrowsers = {
  production: ['>0.2%', 'not dead', 'not op_mini all'],
  development: [
    'last 1 chrome version',
    'last 1 firefox version',
    'last 1 safari version',
  ],
};

async function shouldSetBrowsers(): Promise<boolean> {
  if (!process.stdout.isTTY) {
    return Promise.resolve(true);
  }

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
}

export async function checkBrowsers(dir: string, retry = true): Promise<void> {
  const current = browserslist.loadConfig({ path: dir });
  if (current != null) {
    return Promise.resolve();
  }

  if (!retry) {
    return Promise.reject(
      new Error(
        chalk.red(
          'As of react-scripts >=2 you must specify targeted browsers.',
        ) +
          os.EOL +
          `Please add a ${chalk.underline(
            'browserslist',
          )} key to your ${chalk.bold('package.json')}.`,
      ),
    );
  }

  const shouldUpdateBrowser = await shouldSetBrowsers();
  if (!shouldUpdateBrowser) {
    return checkBrowsers(dir, false);
  }

  const filePath = await pkgUp({ cwd: dir });

  if (filePath == null) {
    return checkBrowsers(dir, false);
  } else {
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
  }
}
