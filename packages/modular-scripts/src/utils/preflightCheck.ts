import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import chalk from 'chalk';
import execa from 'execa';
import * as fs from 'fs-extra';
import isCI from 'is-ci';
import path from 'path';
import updateNotifier from 'update-notifier';
import getModularRoot from './getModularRoot';

async function isYarnInstalled(): Promise<boolean> {
  try {
    await execa('yarnpkg', ['-v']);
    return true;
  } catch (err) {
    return false;
  }
}

type VerifyPackageTree = () => void;

async function preflightCheck(): Promise<void> {
  if (process.env.SKIP_PREFLIGHT_CHECK === 'true' || isCI) {
    if (!isCI) {
      console.warn('Skipping modular preflight checks.');
    }
  } else {
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

    if ((await isYarnInstalled()) === false) {
      throw new Error(
        'Please install `yarn` before attempting to run `modular-scripts`.',
      );
    }

    // ensure that workspaces are setup correctly with yarn
    const modularRoot = getModularRoot();
    try {
      await execa('yarnpkg', ['--silent', 'workspaces', 'info'], {
        cwd: modularRoot,
        cleanup: true,
      });
    } catch (e) {
      const err = e as execa.ExecaSyncError;
      throw new Error(err.stderr);
    }
  }

  if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
    const verifyPackageTree =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('react-scripts/scripts/utils/verifyPackageTree') as VerifyPackageTree;
    verifyPackageTree();
  }
}

export default preflightCheck;
