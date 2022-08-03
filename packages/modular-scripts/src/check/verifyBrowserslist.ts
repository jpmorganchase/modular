import browserslist from 'browserslist';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import prompts from 'prompts';

import * as logger from '../utils/logger';
import getModularRoot from '../utils/getModularRoot';
import getWorkspaceInfo from '../utils/getWorkspaceInfo';
import { defaultBrowsers } from '../utils/checkBrowsers';

import type { ModularPackageJson } from '@modular-scripts/modular-types';

export async function check(): Promise<boolean> {
  let valid = true;

  browserslist.clearCaches();

  const modularRoot = getModularRoot();

  const workspace = await getWorkspaceInfo();

  for (const [packageName, worktree] of Object.entries(workspace)) {
    if (worktree.type === 'app') {
      const current = browserslist.loadConfig({
        path: path.join(modularRoot, worktree.location),
      });

      if (current) {
        logger.debug(`${packageName} has valid browserslist`);
      } else {
        logger.error(`${packageName} does not have browserslist set.`);
        valid = false;
      }
    }
  }

  return valid;
}

async function shouldSetBrowsers(): Promise<boolean> {
  if (process.stdout.isTTY) {
    const answer = await prompts({
      type: 'confirm',
      name: 'shouldSetBrowsers',
      message:
        chalk.yellow("We're unable to detect target browsers.") +
        `\n\nWould you like to add the defaults to your Modular Root ${chalk.bold(
          'package.json',
        )}?`,
      initial: true,
    });

    return answer.shouldSetBrowsers as boolean;
  } else {
    return Promise.resolve(true);
  }
}

export async function fix(): Promise<void> {
  const modularRoot = getModularRoot();
  const workspace = await getWorkspaceInfo();

  for (const worktree of Object.values(workspace)) {
    browserslist.clearCaches();

    if (worktree.type === 'app') {
      const current = browserslist.loadConfig({
        path: path.join(modularRoot, worktree.location),
      });
      if (!current) {
        const shouldUpdateBrowser = await shouldSetBrowsers();
        if (shouldUpdateBrowser) {
          logger.log(
            `Setting target browsers in modular root ${getModularRoot()}`,
          );
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
        }
      }
    }
  }
}
