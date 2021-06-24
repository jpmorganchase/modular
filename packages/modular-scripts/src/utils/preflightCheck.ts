import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import chalk from 'chalk';
import execa from 'execa';
import * as fs from 'fs-extra';
import isCI from 'is-ci';
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
  if (process.env.SKIP_PREFLIGHT_CHECK === 'true' || isCI) {
    if (!isCI) {
      console.warn('Skipping modular preflight checks.');
    }
  } else {
    const { name, version } = fs.readJSONSync(
      require.resolve('modular-scripts/package.json'),
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

    if ((await isYarnInstalled()) === false) {
      throw new Error(
        'Please install `yarn` before attempting to run `modular-scripts`.',
      );
    }
  }

  if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
    const { verifyPackageTree } = await import('./verifyPackageTree');
    await verifyPackageTree();
  }
}

export default preflightCheck;
