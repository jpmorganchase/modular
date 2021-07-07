// While working on this file, be aware that builds
// could be happening simultaneously across packages, so
// try be 'thread-safe'. No state outside of functions

// shorthand for building every workspace, if you're ever debugging this flow
// rm -rf dist && yarn modular build `ls -m1 packages | sed -e 'H;${x;s/\n/,/g;s/^,//;p;};d'`

import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import { promisify } from 'util';
import _rimraf from 'rimraf';
import * as path from 'path';
import { extract } from 'tar';
import execa from 'execa';
import { paramCase as toParamCase } from 'change-case';
import * as fse from 'fs-extra';

import { getLogger } from './getLogger';
import { getPackageEntryPoints } from './getPackageEntryPoints';
import getPackageMetadata from './getPackageMetadata';
import getModularRoot from '../utils/getModularRoot';
import { makeBundle } from './makeBundle';
import { makeTypings } from './makeTypings';
import getRelativeLocation from '../utils/getRelativeLocation';

const outputDirectory = 'dist';

const rimraf = promisify(_rimraf);

export async function buildPackage(
  target: string,
  preserveModules = false,
): Promise<void> {
  const modularRoot = getModularRoot();
  const packagePath = await getRelativeLocation(target);
  const { publicPackageJsons } = getPackageMetadata();

  if (process.cwd() !== modularRoot) {
    throw new Error(
      'This command can only be run from the root of a modular project',
    );
  }

  const logger = getLogger(packagePath);
  // ensure the root build folder is ready
  await fse.mkdirp(outputDirectory);

  // delete any existing local build folders
  await rimraf(path.join(modularRoot, packagePath, `${outputDirectory}-cjs`));
  await rimraf(path.join(modularRoot, packagePath, `${outputDirectory}-es`));
  await rimraf(path.join(modularRoot, packagePath, `${outputDirectory}-types`));

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
    path.join(modularRoot, packagePath, 'package.json'),
  )) as PackageJson;

  const packageName = originalPkgJsonContent.name as string;

  // switch in the special package.json
  try {
    const publicPackageJson = publicPackageJsons[packageName];
    await fse.writeJson(
      path.join(packagePath, 'package.json'),
      publicPackageJson,
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
        cwd: path.join(modularRoot, packagePath),
        stdin: process.stdin,
        stderr: process.stderr,
        stdout: process.stdout,
      },
    );
  } finally {
    // now revert package.json
    await fse.writeJson(
      path.join(modularRoot, packagePath, 'package.json'),
      originalPkgJsonContent,
      { spaces: 2 },
    );
  }

  // cool. now unpack the tgz's contents in the root dist
  await fse.mkdirp(path.join(outputDirectory, toParamCase(packageName)));

  await extract({
    file: path.join(outputDirectory, toParamCase(packageName) + '.tgz'),
    strip: 1,
    C: path.join(outputDirectory, toParamCase(packageName)),
  });

  // (if you're curious why we unpack it here, it's because
  // we observed problems with publishing tgz files directly to npm.)

  // delete the local dist folders
  await rimraf(path.join(modularRoot, packagePath, `${outputDirectory}-cjs`));
  await rimraf(path.join(modularRoot, packagePath, `${outputDirectory}-es`));
  await rimraf(path.join(modularRoot, packagePath, `${outputDirectory}-types`));

  // then delete the tgz

  await fse.remove(
    path.join(modularRoot, outputDirectory, toParamCase(packageName) + '.tgz'),
  );
  /// and... that's it
  logger.log('finished');
}
