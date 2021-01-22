import chalk from 'chalk';
import execa from 'execa';
import * as fs from 'fs-extra';
import isCI from 'is-ci';
import path from 'path';
import updateNotifier from 'update-notifier';
import getModularRoot from './getModularRoot';
import { ModularPackageJson } from './isModularType';

async function isYarnInstalled(): Promise<boolean> {
  try {
    await execa('yarnpkg', ['-v']);
    return true;
  } catch (err) {
    return false;
  }
}

async function preflightCheck(): Promise<void> {
  const packageJson = fs.readJSONSync(
    path.join(__dirname, '..', 'package.json'),
  ) as ModularPackageJson;

  if (process.env.SKIP_PREFLIGHT_CHECK !== 'true' || isCI) {
    const { name, version } = packageJson;
    const message =
      'modular is out of date - you can update from ' +
      chalk.dim('{currentVersion}') +
      chalk.reset(' → ') +
      chalk.green('{latestVersion}') +
      ' \nRun yarn add modular-scripts@{latestVersion} to update';

    const notifier = updateNotifier({
      pkg: { name: name as string, version: version as string },
      shouldNotifyInNpmScript: true,
      updateCheckInterval: 0,
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

  // Validate workspace setup - don't skip this during CI
  if (isCI || process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
    const { workspaces } = fs.readJSONSync(
      getModularRoot(),
    ) as ModularPackageJson;
    if (workspaces) {
      if (workspaces.length > 1) {
        throw new Error(
          'modular expects a single workspaces property with either `packages/*` or `packages/*/*`',
        );
      } else {
        const workspace = workspaces[0];
        if (![`packages/*`, `packages/*/*`].includes(workspace)) {
          throw new Error(
            'modular expects a single workspaces property with either `packages/*` or `packages/*/*`',
          );
        }

        // if we're in multi scope mode then packages must adhere to their respective scope
        if (workspace === `packages/*/*`) {
          fs.readdirSync(path.join(getModularRoot(), 'packages')).forEach(
            (scope) => {
              fs.readdirSync(
                path.join(getModularRoot(), 'packages', scope),
              ).forEach((packageDirName) => {
                const { name: packageName } = fs.readJSONSync(
                  getModularRoot(),
                ) as ModularPackageJson;
                if (!packageName) {
                  throw new Error(
                    `${packageDirName} does not have a package name`,
                  );
                }

                if (packageName.startsWith('@')) {
                  throw new Error(
                    `${packageName} (${scope}/${packageDirName}) is not scoped and must match parent scope ${scope}`,
                  );
                }
                const packageSplit = packageName.slice(1).split('/');
                if (packageSplit?.length !== 2) {
                  throw new Error(
                    `${packageName} is an invalid scoped package name.`,
                  );
                }
                const [packageScope, packageJsonName] = packageSplit;
                if (packageScope !== scope) {
                  throw new Error(
                    `${packageName} is not in the correct scope ${scope}. Please move it to packages/${scope}/${packageDirName}`,
                  );
                }

                if (packageJsonName !== packageDirName) {
                  throw new Error(
                    `${packageName} is not in the correct directory ${packageDirName}. Please move it to packages/${scope}/${packageDirName}`,
                  );
                }
              });
            },
          );
        }
      }
    } else {
      throw new Error(
        'modular expects to execute in Yarn Workspaces - please set a valid workspace property of either `packages/*` or `packages/*/*`',
      );
    }
  }
}

export default preflightCheck;
