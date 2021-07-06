// While working on this file, be aware that builds
// could be happening simultaneously across packages, so
// try be 'thread-safe'. No state outside of functions

// shorthand for building every workspace, if you're ever debugging this flow
// rm -rf dist && yarn modular build `ls -m1 packages | sed -e 'H;${x;s/\n/,/g;s/^,//;p;};d'`

import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';

import { promisify as prom } from 'util';

import rimraf from 'rimraf';
import * as path from 'path';
import { extract } from 'tar';

import execa from 'execa';
import { paramCase as toParamCase } from 'change-case';

import * as fse from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';
import { getLogger } from './getLogger';
import { getPackageEntryPoints } from './getPackageEntryPoints';
import getPackageMetadata from './getPackageMetadata';
import { makeBundle } from './makeBundle';
import { makeTypings } from './makeTypings';

const outputDirectory = 'dist';
const packagesRoot = 'packages';

export async function buildPackage(
  packagePath: string,
  preserveModules = false,
): Promise<void> {
  const { publicPackageJsons } = getPackageMetadata();
  const modularRoot = getModularRoot();

  if (process.cwd() !== modularRoot) {
    throw new Error(
      'This command can only be run from the root of a modular project',
    );
  }

  const logger = getLogger(packagePath);
  // ensure the root build folder is ready
  await fse.mkdirp(outputDirectory);

  // delete any existing local build folders
  await prom(rimraf)(
    path.join(modularRoot, packagesRoot, packagePath, `${outputDirectory}-cjs`),
  );
  await prom(rimraf)(
    path.join(modularRoot, packagesRoot, packagePath, `${outputDirectory}-es`),
  );
  await prom(rimraf)(
    path.join(
      modularRoot,
      packagesRoot,
      packagePath,
      `${outputDirectory}-types`,
    ),
  );

  // Generate the typings for a package first so that we can do type checking and don't waste time bundling otherwise
  const { compilingBin } = getPackageEntryPoints(packagePath);
  if (!compilingBin) {
    makeTypings(packagePath);
  }

  // generate the js files now that we know we have a valid package
  const didBundle = await makeBundle(packagePath, preserveModules);
  if (!didBundle) {
    return;
  }

  const originalPkgJsonContent = (await fse.readJson(
    path.join(modularRoot, packagesRoot, packagePath, 'package.json'),
  )) as PackageJson;

  const packageName = originalPkgJsonContent.name as string;

  // switch in the special package.json
  try {
    await fse.writeJson(
      path.join(modularRoot, packagesRoot, packagePath, 'package.json'),
      publicPackageJsons[packageName],
      { spaces: 2 },
    );

    await execa(
      'yarnpkg',
      // TODO: verify this works on windows
      [
        'pack',
        '--silent',
        '--filename',
        path.join(
          modularRoot,
          outputDirectory,
          toParamCase(packageName) + '.tgz',
        ),
      ],
      {
        cwd: path.join(modularRoot, packagesRoot, packagePath),
        stdin: process.stdin,
        stderr: process.stderr,
        stdout: process.stdout,
      },
    );
  } finally {
    // now revert package.json
    await fse.writeJson(
      path.join(modularRoot, packagesRoot, packagePath, 'package.json'),
      originalPkgJsonContent,
      { spaces: 2 },
    );
  }

  // cool. now unpack the tgz's contents in the root dist
  await fse.mkdirp(path.join(outputDirectory, packagePath));

  await extract({
    file: path.join(outputDirectory, toParamCase(packageName) + '.tgz'),
    strip: 1,
    C: path.join(outputDirectory, packagePath),
  });

  // (if you're curious why we unpack it here, it's because
  // we observed problems with publishing tgz files directly to npm.)

  // delete the local dist folders
  await prom(rimraf)(
    path.join(modularRoot, packagesRoot, packagePath, `${outputDirectory}-cjs`),
  );
  await prom(rimraf)(
    path.join(modularRoot, packagesRoot, packagePath, `${outputDirectory}-es`),
  );
  await prom(rimraf)(
    path.join(
      modularRoot,
      packagesRoot,
      packagePath,
      `${outputDirectory}-types`,
    ),
  );

  // then delete the tgz

  await fse.remove(
    path.join(modularRoot, outputDirectory, toParamCase(packageName) + '.tgz'),
  );
  /// and... that's it
  logger.log('finished');
}
