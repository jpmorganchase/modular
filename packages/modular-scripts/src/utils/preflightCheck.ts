import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import chalk from 'chalk';
import execa from 'execa';
import * as fs from 'fs-extra';
import isCI from 'is-ci';
import path from 'path';
import updateNotifier from 'update-notifier';

async function isYarnInstalled(): Promise<boolean> {
  try {
    await execa('yarnpkg', ['-v']);
    return true;
  } catch (err) {
    return false;
  }
}

async function preflightCheck(): Promise<void> {
  if (process.env.SKIP_PREFLIGHT_CHECK !== 'true' || isCI) {
    const { name, version } = fs.readJSONSync(
      path.join(__dirname, '..', '..', 'package.json'),
    ) as PackageJson;

    const message =
      'modular is out of date - you can update from ' +
      chalk.dim('{currentVersion}') +
      chalk.reset(' → ') +
      chalk.green('{latestVersion}') +
      ' \nRun yarn add modular-scripts@{latestVersion} to update';

    const notifier = updateNotifier({
      pkg: { name: name as string, version: version as string },
      shouldNotifyInNpmScript: true,
    });

    if (notifier.update) {
      notifier.notify({
        message,
        defer: false,
        isGlobal: false,
      });
    }
  }

  if ((await isYarnInstalled()) === false) {
    throw new Error(
      'Please install `yarn` before attempting to run `modular-scripts`.',
    );
  }
}

export default preflightCheck;
