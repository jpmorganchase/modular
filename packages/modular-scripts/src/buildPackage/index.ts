// While working on this file, be aware that builds
// could be happening simultaneously across packages, so
// try be 'thread-safe'. No state outside of functions

// shorthand for building every workspace, if you're ever debugging this flow
// rm -rf dist && yarn modular build `ls -m1 packages | sed -e 'H;${x;s/\n/,/g;s/^,//;p;};d'`

import * as path from 'path';
import { paramCase as toParamCase } from 'change-case';
import fs from 'fs-extra';
import npmPacklist from 'npm-packlist';
import micromatch from 'micromatch';

import { getLogger } from './getLogger';
import { getPackageEntryPoints } from './getPackageEntryPoints';
import getModularRoot from '../utils/getModularRoot';
import { makeBundle } from './makeBundle';
import { makeTypings } from './makeTypings';
import getRelativeLocation from '../utils/getRelativeLocation';

const outputDirectory = 'dist';

const IGNORED_FILES = [
  '!package.json',
  '!src',
  '!dist-cjs',
  '!dist-es',
  '!dist-types',
];

export async function buildPackage(
  target: string,
  preserveModules = true,
  includePrivate = false,
): Promise<void> {
  const modularRoot = getModularRoot();
  const packagePath = await getRelativeLocation(target);

  const logger = getLogger(packagePath);

  const targetOutputDirectory = path.join(
    modularRoot,
    outputDirectory,
    toParamCase(target),
  );

  // ensure the root build folder is ready
  await fs.mkdirp(targetOutputDirectory);
  await fs.emptyDir(targetOutputDirectory);

  // Generate the typings for a package first so that we can do type checking and don't waste time bundling otherwise
  const { compilingBin } = await getPackageEntryPoints(
    packagePath,
    includePrivate,
  );
  if (!compilingBin) {
    await makeTypings(target);
  }

  // generate the js files now that we know we have a valid package
  const publicPackageJson = await makeBundle(
    target,
    preserveModules,
    includePrivate,
  );

  await fs.writeJson(
    path.join(targetOutputDirectory, 'package.json'),
    publicPackageJson,
    { spaces: 2 },
  );

  // cool. now we copy across any files which we need using npm-packlist
  const packlist = await npmPacklist({
    path: path.join(modularRoot, packagePath),
  });

  micromatch(
    packlist,
    (publicPackageJson.files || []).concat(IGNORED_FILES),
  ).forEach((fileName) => {
    logger.log(`Copying ${fileName}`);
    return fs.copyFileSync(
      path.join(modularRoot, packagePath, fileName),
      path.join(targetOutputDirectory, fileName),
    );
  });

  /// and... that's it
  logger.log(`built ${target} in ${targetOutputDirectory}`);
}
