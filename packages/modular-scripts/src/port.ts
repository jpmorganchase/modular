import * as fs from 'fs-extra';
import * as path from 'path';
import execa from 'execa';
import { Dependency } from '@schemastore/package';

import * as logger from './utils/logger';
import getModularRoot from './utils/getModularRoot';
import actionPreflightCheck from './utils/actionPreflightCheck';
import { ModularPackageJson } from './utils/isModularType';
import { cleanGit, stashChanges } from './utils/gitActions';
import { check } from './check';
import rimraf from 'rimraf';

process.on('SIGINT', () => {
  stashChanges();
  process.exit(1)
});

export async function port(relativePath: string): Promise<void> {
  const modularRoot = getModularRoot();
  // if (!cleanGit(modularRoot)) {
  //   throw new Error(
  //     'You have unsaved changes. Please save or stash them before we attempt to port this react app to your modular project.',
  //   );
  // }

  try {
    const targetRoot = path.resolve(relativePath);

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

    logger.debug('Migrating setupTests if not already present')

    const setupFileName = 'setupTests';
    const setupFilesExts = ['setupTests.js', 'setupTests.ts'];

    const setupTests = setupFilesExts.find((file) => {
      return fs.existsSync(path.join(newPackagePath, 'src', file));
    });

    if (
      fs.existsSync(path.join(modularRoot, 'modular')) &&
      !fs
        .readdirSync(path.join(modularRoot, 'modular'))
        .some((f) => f.includes(setupFileName))
    ) {
      // check if setupTests are already present in modular folder
      // if not, move it over
      setupFilesExts.forEach((ext) => {
        const file = `${setupFileName}.${ext}`;
        if (fs.existsSync(path.join(newPackagePath, 'src', file))) {
          fs.writeFileSync(
            path.join(modularRoot, 'modular', file),
            fs.readFileSync(path.join(newPackagePath, 'src', file), 'utf8'),
          );
          rimraf.sync(path.join(newPackagePath, 'src', file));
        }
      });
    } else if (fs.existsSync(path.join(modularRoot, 'modular'))) {
    }



    // Staging ported package.json
    const { name, version, browserslist } = targetedAppPackageJson;

    const portedPackageJson: ModularPackageJson = {
      name,
      version,
      browserslist,
      modular: {
        type: 'app',
      },
    };

    logger.log('Resolving dependencies...');

    const modularRootPackageJson = (await fs.readJSON(
      path.join(modularRoot, 'package.json'),
    )) as ModularPackageJson;

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
     * This is not related to yarn workspaces mismatchedWorkspaceDependencies
     * property in workspace info.
     * (https://github.com/yarnpkg/yarn/issues/6898#issuecomment-478188695)
     *
     * MismatchedWorkspaceDependencies are when you have a workspace depending on
     * another workspace, but on a version not satisfied by the one in the repo.
     * (i.e package-a@1.0.1 depends on package-b@^1.1.0 but the package-b that you
     * have locally is at version 2.0.0.
     *
     * It's important to know, because at that point package-b won't be symlinked
     * to package-a at all. package-a gets its own copy of package-b in its node_modules
     *
     */

    const { dependencies: rootDeps = {}, devDependencies: rootDevDeps = {} } =
      modularRootPackageJson;

    const {
      dependencies: targetDeps = {},
      devDependencies: targetDevDeps = {},
    } = targetedAppPackageJson;

    // if root deps does not have it, add it to target deps
    const workspaceDeps: Dependency = Object.keys(targetDeps || {}).reduce(
      (acc, dep) => {
        if (!rootDeps[dep] && dep !== 'react-scripts') {
          return { ...acc, [dep]: targetDeps[dep] };
        }
        return acc;
      },
      {},
    );

    // if root devDeps does not have it, add it to target devDeps
    const workspaceDevDeps = Object.keys(targetDevDeps || {}).reduce(
      (acc, devDep) => {
        if (!rootDevDeps[devDep]) {
          return { ...acc, [devDep]: targetDevDeps[devDep] };
        }
        return acc;
      },
      {},
    );

    // add updated dependencies to new app package.json
    fs.writeJsonSync(
      path.join(newPackagePath, 'package.json'),
      {
        ...portedPackageJson,
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
    // stashChanges();
  }
}

export default actionPreflightCheck(port);
