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

process.on('SIGINT', () => {
  stashChanges();
});

export async function port(relativePath: string): Promise<void> {
  const modularRoot = getModularRoot();
  if (!cleanGit(modularRoot)) {
    throw new Error(
      'You have unsaved changes. Please save or stash them before we attempt to port this react app to your modular project.',
    );
  }

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

    logger.debug('Updating your src/react-app-env.d.ts for modular-scripts');

    fs.writeFileSync(
      path.join(newPackagePath, 'src', 'react-app-env.d.ts'),
      fs.readFileSync(
        path.join(packageTypePath, 'src', 'react-app-env.d.ts'),
        'utf8',
      ),
    );

    fs.writeJSONSync(
      path.join(newPackagePath, 'tsconfig.json'),
      {
        extends: path.relative(newPackagePath, modularRoot) + '/tsconfig.json',
      },
      { spaces: 2 },
    );

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
     * This doen't set up 'nohoist' or 'exceptions' in workspaces
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
     *
     * This is not related to yarn workspaces' mismatchedWorkspaceDependencies
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

    // if root devDeps does not have this, add it to target devDeps
    const workspaceDevDeps = Object.keys(targetDevDeps || {}).reduce(
      (acc, devDep) => {
        if (!rootDevDeps[devDep]) {
          return { ...acc, [devDep]: targetDevDeps[devDep] };
        }
        return acc;
      },
      {},
    );

    // update dependencies to new app package.json
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
    stashChanges();
  }
}

export default actionPreflightCheck(port);
