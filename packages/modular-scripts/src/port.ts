import * as fs from 'fs-extra';
import * as path from 'path';
import execa from 'execa';

import * as logger from './utils/logger';
import getModularRoot from './utils/getModularRoot';
import actionPreflightCheck from './utils/actionPreflightCheck';
import { ModularPackageJson } from './utils/isModularType';
import { cleanGit, resetChanges } from './utils/gitActions';
import { check } from './check';

process.on('SIGINT', () => {
  resetChanges();
});

export async function port(relativePath: string): Promise<void> {
  const modularRoot = getModularRoot();
  if (!cleanGit(modularRoot)) {
    throw new Error(
      'You have unsaved changes. Please save or stash them before we attempt to convert this react app to modular app.',
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
    fs.mkdirSync(newPackagePath);

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
     * This does not set up nohoist in workspaces for dependencies
     * that have mismatched versions. If the targeted app has a
     * dependency that is versioned differently than modular root
     * dependency, you will need to resolve it manually.
     *
     * Same deal if the targeted app has a dev dependency that is marked
     * as a dependency in modular root. It will be ported over
     * into the modular app as a dev dependency and you will have to
     * resolve any dependency issues yourself.
     */

    const { dependencies: rootDeps = {}, devDependencies: rootDevDeps = {} } =
      modularRootPackageJson;

    const {
      dependencies: targetDeps = {},
      devDependencies: targetDevDeps = {},
    } = targetedAppPackageJson;

    const dependencies = Object.keys(targetDeps || {}).reduce((acc, dep) => {
      if (!rootDeps[dep]) {
        return { ...acc, [dep]: targetDeps[dep] };
      }
      return acc;
    }, {});

    const devDependencies = Object.keys(targetDevDeps || {}).reduce(
      (acc, devDep) => {
        if (!acc[devDep]) {
          return { ...acc, [devDep]: targetDevDeps[devDep] };
        }
        return acc;
      },
      { ...rootDevDeps },
    );

    // Move additional dependencies to new app package.json
    fs.writeFileSync(
      path.join(newPackagePath, 'package.json'),
      JSON.stringify({ ...portedPackageJson, dependencies }, null, 2),
    );

    // Add target app dev dependencies to root
    fs.writeFileSync(
      path.join(modularRoot, 'package.json'),
      JSON.stringify({ ...modularRootPackageJson, devDependencies }, null, 2),
    );

    logger.log('Installing dependencies...');

    execa.sync('yarnpkg', ['--silent'], { cwd: modularRoot });

    logger.log('Validating your modular project...');
    await check();
  } catch (err) {
    logger.error(err);
    resetChanges();
  }
}

export default actionPreflightCheck(port);
