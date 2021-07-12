import * as fs from 'fs-extra';
import * as path from 'path';
import execa from 'execa';
import { Dependency } from '@schemastore/package';
import rimraf from 'rimraf';
import chalk from 'chalk';

import * as logger from './utils/logger';
import getModularRoot from './utils/getModularRoot';
import getWorkspaceInfo from './utils/getWorkspaceInfo';
import actionPreflightCheck from './utils/actionPreflightCheck';
import { ModularPackageJson } from './utils/isModularType';
import { cleanGit, stashChanges } from './utils/gitActions';
import { check } from './check';

process.on('SIGINT', () => {
  stashChanges();
  process.exit(1);
});

export async function port(relativePath: string): Promise<void> {
  const modularRoot = getModularRoot();
  if (!cleanGit(modularRoot)) {
    throw new Error(
      'You have unsaved changes. Please save or stash them before we attempt to port this react app to your modular project.',
    );
  }

  try {
    const targetRoot = path.resolve(modularRoot, relativePath);

    const targetedAppPackageJson = (await fs.readJSON(
      path.join(targetRoot, 'package.json'),
    )) as ModularPackageJson;

    const targetedAppName = targetedAppPackageJson.name as string;

    logger.log(
      `Porting ${targetedAppName} over into packages as a modular app...`,
    );
    // Create a modular app package to funnel targeted app into
    const packageTypePath = path.join(__dirname, '../types', 'app');
    const newPackagePath = path.join(modularRoot, 'packages', targetedAppName);
    fs.mkdirpSync(newPackagePath);

    // Copy the targeted folders to the modular app
    const srcFolders = ['src', 'public'];
    srcFolders.forEach((dir: string) => {
      if (fs.existsSync(path.join(targetRoot, dir))) {
        fs.copySync(
          path.join(targetRoot, dir),
          path.join(newPackagePath, dir),
          { overwrite: true },
        );
      } else {
        fs.copySync(
          path.join(packageTypePath, dir),
          path.join(newPackagePath, dir),
          { overwrite: true },
        );
      }
    });

    logger.debug('Updating your react-app-env.d.ts for modular-scripts');

    if (fs.existsSync(path.join(newPackagePath, 'src', 'react-app-env.d.ts'))) {
      fs.writeFileSync(
        path.join(newPackagePath, 'src', 'react-app-env.d.ts'),
        fs
          .readFileSync(
            path.join(newPackagePath, 'src', 'react-app-env.d.ts'),
            'utf8',
          )
          .replace(
            '<reference types="react-scripts" />',
            '<reference types="modular-scripts/react-app-env" />',
          ),
      );
    }

    fs.writeJSONSync(
      path.join(newPackagePath, 'tsconfig.json'),
      {
        extends: path.relative(newPackagePath, modularRoot) + '/tsconfig.json',
      },
      { spaces: 2 },
    );

    logger.debug('Migrating setupTests file if it does not already exist');

    const setupFilesExts = ['setupTests.js', 'setupTests.ts'];

    const originSetupTest = setupFilesExts.find((file) => {
      return fs.existsSync(path.join(newPackagePath, 'src', file));
    });

    const modularSetUpTest = setupFilesExts.find((file) => {
      return fs.existsSync(path.join(modularRoot, 'modular', file));
    });

    if (originSetupTest && !modularSetUpTest) {
      fs.mkdirpSync(path.join(modularRoot, 'modular'));
      fs.writeFileSync(
        path.join(modularRoot, 'modular', originSetupTest),
        fs.readFileSync(
          path.join(newPackagePath, 'src', originSetupTest),
          'utf8',
        ),
      );
      rimraf.sync(path.join(newPackagePath, 'src', originSetupTest));
    }

    if (originSetupTest && modularSetUpTest) {
      logger.log(
        chalk.gray(
          'There is already a setupTests file present in the modular folder. ' +
            "Skipping porting the app's setupTests file over...",
        ),
      );
      rimraf.sync(path.join(newPackagePath, 'src', originSetupTest));
    }

    // Staging ported package.json
    const {
      name,
      version,
      browserslist,
      private: prv,
    } = targetedAppPackageJson;

    const stagedPackageJson: ModularPackageJson = {
      name,
      version,
      browserslist,
      modular: {
        type: 'app',
      },
      private: prv,
    };

    /* ****** NOTE ******
     * This does not set up 'nohoist' or 'exceptions' in workspaces
     * for mismatched versions. If the targeted app has a
     * dependency that is versioned differently than the modular root
     * dependency, the package & version in modular root will take precedence.
     *
     * If the targeted app has a devDependency that is marked
     * as a dependency in modular root, it will not be ported over
     * into the modular app as a devDependency but instead be kept as a
     * dependency in modular root.
     *
     * During this resolution, if modular root has the package in its
     * dependencies, the version in modular root will take precedence.
     *
     * This may affect the yarn workspaces mismatchedWorkspaceDependencies
     * property in workspace info.
     * (https://github.com/yarnpkg/yarn/issues/6898#issuecomment-478188695)
     *
     * Given the case that the app you are porting over has a dependency that is a
     * local package in the workspace, if the target app's dep has a different
     * version than the local version, that package would not be symlinked to
     * the local package at all. It would get its own copy in its node_modules.
     *
     * Example:
     * TargetApp's dependency: foo@^1.0.5
     * Modular package foo's local version: 2.0.1
     *
     * TargetApp will have copy of foo@1.0.5 in its workspace node_modules.
     * It will be marked as a mismatchedWorkspaceDependencies in yarn workspaces.
     *
     * We do not allow mismatchedWorkspaceDependencies in the modular workspace.
     * Thus, we will remove that dependency from the target app and have it use
     * the local symlinked version instead.
     *
     */

    logger.log('Resolving dependencies...');

    const modularRootPackageJson = (await fs.readJSON(
      path.join(modularRoot, 'package.json'),
    )) as ModularPackageJson;

    const { dependencies: rootDeps = {}, devDependencies: rootDevDeps = {} } =
      modularRootPackageJson;

    const {
      dependencies: targetDeps = {},
      devDependencies: targetDevDeps = {},
    } = targetedAppPackageJson;

    const workspaces = await getWorkspaceInfo();

    const publicPackages = Object.keys(workspaces).filter(
      (name) => workspaces[name].public,
    );

    const workspaceDeps: Dependency = Object.keys(targetDeps || {}).reduce(
      (acc, dep) => {
        // Do not bring over dep if modular root has it or if it's react-scripts
        // or if it is already a public package in the modular workspace
        if (
          !rootDeps[dep] &&
          dep !== 'react-scripts' &&
          !publicPackages.includes(dep)
        ) {
          return { ...acc, [dep]: targetDeps[dep] };
        }
        if (workspaces[dep] !== undefined) {
          logger.warn(
            `The targeted app has local '${chalk.bold(
              dep,
            )}' package marked as a dependency. `,
          );
          logger.warn('We will be ignoring this dependency.');
          logger.warn(
            `${targetedAppName} will now use the local package symlinked version.`,
          );
        }
        return acc;
      },
      {},
    );

    const workspaceDevDeps = Object.keys(targetDevDeps || {}).reduce(
      (acc, devDep) => {
        // Do not bring over dev dep if modular root has it installed
        // or if it is already a public package in the modular workspace
        if (
          !rootDevDeps[devDep] &&
          !rootDeps[devDep] &&
          !publicPackages.includes(devDep)
        ) {
          return { ...acc, [devDep]: targetDevDeps[devDep] };
        }
        if (workspaces[devDep] !== undefined) {
          logger.warn(
            `The targeted app has local ${chalk.bold(
              devDep,
            )} package marked as a dev dependency. `,
          );
          logger.warn('We will be ignoring this dependency.');
          logger.warn(
            `${targetedAppName} will now use the local package symlinked version.`,
          );
        }
        return acc;
      },
      {},
    );

    // Add updated dependencies to new app's package.json
    fs.writeJsonSync(
      path.join(newPackagePath, 'package.json'),
      {
        ...stagedPackageJson,
        dependencies: workspaceDeps,
        devDependencies: workspaceDevDeps,
      },
      { spaces: 2 },
    );

    logger.log('Installing dependencies...');

    execa.sync('yarnpkg', ['--silent'], { cwd: modularRoot });

    logger.log('Validating your modular project...');
    await check();
  } catch (err) {
    logger.error(err);
    stashChanges();
  }
}

export default actionPreflightCheck(port);
