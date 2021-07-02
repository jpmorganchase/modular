// While working on this file, be aware that builds
// could be happening simultaneously across packages, so
// try be 'thread-safe'. No state outside of functions

// shorthand for building every workspace, if you're ever debugging this flow
// rm -rf dist && yarn modular build `ls -m1 packages | sed -e 'H;${x;s/\n/,/g;s/^,//;p;};d'`

import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';

import { promisify } from 'util';

import * as rollup from 'rollup';
import _rimraf from 'rimraf';
import * as path from 'path';
import { extract } from 'tar';

import execa from 'execa';
import { paramCase as toParamCase } from 'change-case';

import postcss from 'rollup-plugin-postcss';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { preserveShebangs } from 'rollup-plugin-preserve-shebangs';

import * as fse from 'fs-extra';

import builtinModules from 'builtin-modules';
import getModularRoot from '../utils/getModularRoot';
import chalk from 'chalk';
import { getLogger } from './getLogger';
import { getPackageEntryPoints } from './getPackageEntryPoints';
import getPackageMetadata from './getPackageMetadata';
import { makeTypings } from './makeTypings';
import getLocation from '../utils/getLocation';

const extensions = ['.ts', '.tsx', '.js', '.jsx'];
const outputDirectory = 'dist';
const packagesRoot = 'packages';

const rimraf = promisify(_rimraf);

function distinct<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

async function makeBundle(
  packagePath: string,
  preserveModules: boolean,
): Promise<boolean> {
  const {
    packageNames,
    packageJsons,
    publicPackageJsons,
    packageJsonsByPackagePath,
    rootPackageJsonDependencies,
  } = getPackageMetadata();

  const logger = getLogger(packagePath);

  const packageJson = packageJsonsByPackagePath[packagePath];

  const { main, compilingBin } = getPackageEntryPoints(packagePath);

  if (!packageJson) {
    throw new Error(
      `no package.json in ${packagesRoot}/${packagePath}, bailing...`,
    );
  }
  if (packageJson.private === true) {
    throw new Error(
      `${packagesRoot}/${packagePath} is marked private, bailing...`,
    );
  }

  if (!fse.existsSync(path.join(packagesRoot, packagePath, main))) {
    throw new Error(
      `package.json at ${packagesRoot}/${packagePath} does not have a main file that points to an existing source file, bailing...`,
    );
  }

  if (!packageJson.name) {
    throw new Error(
      `package.json at ${packagesRoot}/${packagePath} does not have a valid "name", bailing...`,
    );
  }

  if (!packageJson.version) {
    throw new Error(
      `package.json at ${packagesRoot}/${packagePath} does not have a valid "version", bailing...`,
    );
  }

  if (packageJson.module) {
    throw new Error(
      `package.json at ${packagesRoot}/${packagePath} shouldn't have a "module" field, bailing...`,
    );
  }

  if (packageJson.typings) {
    throw new Error(
      `package.json at ${packagesRoot}/${packagePath} shouldn't have a "typings" field, bailing...`,
    );
  }
  logger.log(`building ${packageJson.name} at packages/${packagePath}...`);

  const bundle = await rollup.rollup({
    input: path.join(packagesRoot, packagePath, main),
    external: (id) => {
      // via tsdx
      // TODO: this should probably be included into deps instead
      if (id === 'babel-plugin-transform-async-to-promises/helpers') {
        // we want to inline these helpers
        return false;
      }
      // exclude any dependency that's not a realtive import
      return !id.startsWith('.') && !path.isAbsolute(id);
    },
    treeshake: {
      // via tsdx: Don't use getters and setters on plain objects.
      propertyReadSideEffects: false,
    },
    plugins: [
      resolve({
        extensions,
        browser: true,
        mainFields: ['module', 'main', 'browser'],
      }),
      commonjs({ include: /\/node_modules\// }),
      babel({
        babelHelpers: 'bundled',
        presets: [
          // Preset orders matters, please see: https://github.com/babel/babel/issues/8752#issuecomment-486541662
          [
            '@babel/preset-env',
            // TODO: why doesn't this read `targets` from package.json?
            {
              targets: {
                // We should be building packages for environments which support esmodules given their wide support now.
                esmodules: true,
              },
            },
          ],
          ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
          '@babel/preset-react',
        ],
        plugins: ['@babel/plugin-proposal-class-properties'],
        extensions,
        include: [`${packagesRoot}/**/*`],
        exclude: 'node_modules/**',
      }),
      postcss({ extract: false }),
      // TODO: add sass, dotenv
      json(),
      preserveShebangs(),
    ],
    // TODO: support for css modules, sass, dotenv,
    // and anything else create-react-app supports
    // (alternatively, disable support for those in apps)
  });

  const outputOptions: rollup.OutputOptions = {
    freeze: false,
    sourcemap: true, // TODO: read this off env
  };

  // we're going to use bundle.write() to actually generate the
  // output files, but first we're going to do a scan
  // to validate dependencies and collect some metadata for later
  const { output } = await bundle.generate(outputOptions);
  // TODO: we should use this loop to generate the files itself
  // to avoid the second scan, but it's ok for now I guess.

  // "local" workspaces/packages that were imported, i.e - packages/*
  const localImports: { [name: string]: string } = {};

  // this is used to collect local filenames being referenced
  // to prevent errors where facades are imported as dependencies
  // and are collected in missingDependencies
  const localFileNames = new Set<string>();

  // imports that aren't defined in package.json or root package.json
  // Now, this will also mark dependencies that were transient/nested,
  // but I think that's the right choice; a dependency might remove it,
  // even in a patch, and it'll break your code and you wouldn't know why.
  const missingDependencies: Set<string> = new Set();

  for (const chunkOrAsset of output) {
    if (chunkOrAsset.type === 'asset') {
      // TODO: what should happen here?
    } else {
      // it's a 'chunk' of source code, let's analyse it
      for (const imported of [
        ...chunkOrAsset.imports,
        ...chunkOrAsset.dynamicImports,
      ]) {
        // get the dependency (without references any inner modules)
        const importedPath = imported.split('/');
        const importedPackage =
          // scoped package?
          importedPath[0][0] === '@'
            ? `${importedPath[0]}/${importedPath[1]}`
            : // non-scoped
              importedPath[0];

        if (
          importedPackage !== imported &&
          packageNames.includes(importedPackage) &&
          // it's fine if it's anything but a js file
          extensions.includes(path.extname(imported))
        ) {
          // TODO: revisit this if and when we have support for multiple entrypoints
          // TODO: add a line number and file name here
          logger.error(
            `cannot import a submodule ${imported} from ${importedPackage}`,
          );
          // TODO: This could probably be an error, but
          // let's revisit it when we have a better story.
        }

        if (packageJsons[importedPackage]) {
          // This means we're importing from a local workspace
          // Let's collect the name and add it in the package.json
          // we publish to the registry
          // TODO: make sure local workspaces are NOT explicitly included in package.json
          if (packageJsons[importedPackage].private !== true) {
            localImports[importedPackage] = packageJsons[importedPackage]
              .version as string;
          } else {
            throw new Error(
              `referencing a private package: ${importedPackage}`,
            ); // TODO - lineNo, filename
          }
        } else {
          // remote
          if (
            // not mentioned in the local package.json
            !packageJson.dependencies?.[importedPackage] &&
            !packageJson.peerDependencies?.[importedPackage]
          ) {
            if (rootPackageJsonDependencies[importedPackage]) {
              localImports[importedPackage] =
                rootPackageJsonDependencies[importedPackage];
            } else {
              // not mentioned in the root package.json either, so
              // let's collect its name and throw an error later
              // TODO: if it's in root's dev dependencies, should throw a
              // different kind of error
              if (!builtinModules.includes(importedPackage)) {
                // save filename to remove from missingDeps later
                // if they exist there
                localFileNames.add(chunkOrAsset.fileName);
                missingDependencies.add(importedPackage);
              }
            }
          }
        }
      }
    }
  }

  if (Object.keys(localImports).length > 0) {
    logger.log('Adding dependencies to the generated package.json:');
    Object.entries(localImports).forEach(([packageName, packageVersion]) => {
      logger.log(`\t${packageName}: ${chalk.green(packageVersion)}`);
    });
  }

  // remove local filenames from missingDependencies
  const missingDependenciesWithoutLocalFileNames = [
    ...missingDependencies,
  ].filter((dep) => !localFileNames.has(dep));

  if (missingDependenciesWithoutLocalFileNames.length > 0) {
    throw new Error(
      `Missing dependencies: ${missingDependenciesWithoutLocalFileNames.join(
        ', ',
      )};`, // TODO: lineNo, filename
    );
  }

  // now actually write the bundles to disk
  // TODO: write to disk in the above check itself to prevent this 2nd pass

  await bundle.write({
    ...outputOptions,
    ...(preserveModules
      ? {
          preserveModules: true,
          dir: path.join(packagesRoot, packagePath, `${outputDirectory}-cjs`),
        }
      : {
          file: path.join(
            packagesRoot,
            packagePath,
            `${outputDirectory}-cjs`,
            toParamCase(packageJson.name) + '.cjs.js',
          ),
        }),
    format: 'cjs',
    exports: 'auto',
  });

  if (!compilingBin) {
    await bundle.write({
      ...outputOptions,
      ...(preserveModules
        ? {
            preserveModules: true,
            dir: path.join(packagesRoot, packagePath, `${outputDirectory}-es`),
          }
        : {
            file: path.join(
              packagesRoot,
              packagePath,
              `${outputDirectory}-es`,
              toParamCase(packageJson.name) + '.es.js',
            ),
          }),
      format: 'es',
      exports: 'auto',
    });
  }

  let outputFilesPackageJson: Partial<PackageJson>;
  if (compilingBin && packageJson.bin) {
    const binName = Object.keys(packageJson.bin)[0];
    const binPath = main
      .replace(/\.tsx?$/, '.js')
      .replace(path.dirname(main) + '/', '');

    outputFilesPackageJson = {
      bin: {
        [binName]: binPath,
      },
    };
  } else {
    outputFilesPackageJson = {
      // TODO: what of 'bin' fields?
      main: preserveModules
        ? path.join(
            `${outputDirectory}-cjs`,
            main
              .replace(/\.tsx?$/, '.js')
              .replace(path.dirname(main) + '/', ''),
          )
        : `${outputDirectory}-cjs/${toParamCase(packageJson.name) + '.cjs.js'}`,
      module: preserveModules
        ? path.join(
            `${outputDirectory}-es`,
            main
              .replace(/\.tsx?$/, '.js')
              .replace(path.dirname(main) + '/', ''),
          )
        : `${outputDirectory}-es/${toParamCase(packageJson.name) + '.es.js'}`,
      typings: path.join(
        `${outputDirectory}-types`,
        main.replace(/\.tsx?$/, '.d.ts'),
      ),
    };
  }

  // store the public facing package.json that we'll write to disk later
  publicPackageJsons[packageJson.name] = {
    ...packageJson,
    ...outputFilesPackageJson,
    dependencies: {
      ...packageJson.dependencies,
      ...localImports,
    },
    files: distinct([
      ...(packageJson.files || []),
      '/dist-cjs',
      '/dist-es',
      '/dist-types',
      'README.md',
    ]),
  };

  logger.log(`built ${packageJson.name} at ${packagePath}`);
  return true;
}

export async function buildPackage(
  target: string,
  preserveModules = false,
): Promise<void> {
  const modularRoot = getModularRoot();
  const packagePath = await getLocation(target);
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
  await rimraf(
    path.join(modularRoot, packagesRoot, packagePath, `${outputDirectory}-cjs`),
  );
  await rimraf(
    path.join(modularRoot, packagesRoot, packagePath, `${outputDirectory}-es`),
  );
  await rimraf(
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
    path.join(packagesRoot, packagePath, 'package.json'),
  )) as PackageJson;

  const packageName = originalPkgJsonContent.name as string;

  // switch in the special package.json
  try {
    const publicPackageJson = publicPackageJsons[packageName];
    await fse.writeJson(
      path.join(packagesRoot, packagePath, 'package.json'),
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
        cwd: packagesRoot + '/' + packagePath,
        stdin: process.stdin,
        stderr: process.stderr,
        stdout: process.stdout,
      },
    );
  } finally {
    // now revert package.json
    await fse.writeJson(
      path.join(packagesRoot, packagePath, 'package.json'),
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
  await rimraf(path.join(packagesRoot, packagePath, `${outputDirectory}-cjs`));
  await rimraf(path.join(packagesRoot, packagePath, `${outputDirectory}-es`));
  await rimraf(
    path.join(packagesRoot, packagePath, `${outputDirectory}-types`),
  );

  // then delete the tgz

  await fse.remove(
    path.join(modularRoot, outputDirectory, toParamCase(packageName) + '.tgz'),
  );
  /// and... that's it
  logger.log('finished');
}

/* TODO:

- build command
  - rm -rf dist && yarn modular build create-modular-react-app,modular-scripts --preserve-modules && yarn workspace modular-views.macro build
- cleanup local dist folders on errors
- read preset-env targets from package.json
  - also, if something _does_ need regenerator, how do we add it as a dep?
- package.json should be able to specify build arguments. Specifically:
  - preserveModules: boolean
  - preserveEntrySignatures:  "strict" | "allow-extension" | "exports-only" | false
- should we disallow using __dirname/__filename in libraries?
- how do we deal with bin fields? maybe inside a standalone bin file,
  we can read package.json's main field?? That could be clever.
- rewrite modular-views.macro with typescript
- how does this work with changesets?
- some kind of build info would be helpful? eg: https://unpkg.com/browse/react@17.0.1/build-info.json
- can we run tests on our built versions? to verify we haven't broken anything.
*/
