import type { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import chalk from 'chalk';
import execa from 'execa';
import * as fs from 'fs-extra';
import isCI from 'is-ci';
import updateNotifier from 'update-notifier';
import * as logger from './logger';
import * as semver from 'semver';

async function isYarnInstalled(): Promise<boolean> {
  try {
    await execa('yarn', ['-v']);
    return true;
  } catch (err) {
    return false;
  }
}

async function startupCheck(): Promise<void> {
  const { name, version, engines } = fs.readJSONSync(
    require.resolve('modular-scripts/package.json'),
  ) as PackageJson;

  const nodeEngines = engines?.node as string;
  if (!semver.satisfies(process.version, nodeEngines)) {
    throw new Error(
      `${process.version} does not satisfy modular engine constraint ${nodeEngines}`,
    );
  }

  if (process.env.SKIP_MODULAR_STARTUP_CHECK === 'true' || isCI) {
    if (!isCI) {
      logger.warn('Skipping modular startup checks.');
    }
  } else {
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
    } else {
      logger.debug(`Running latest version of modular ${version as string}`);
    }

    if ((await isYarnInstalled()) === false) {
      throw new Error(
        'Please install `yarn` before attempting to run `modular-scripts`.',
      );
    }
  }
}

export default startupCheck;
