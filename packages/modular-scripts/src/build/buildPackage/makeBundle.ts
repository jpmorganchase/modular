import { paramCase as toParamCase } from 'change-case';
import * as path from 'path';
import builtinModules from 'builtin-modules';
import chalk from 'chalk';

import * as rollup from 'rollup';
import esbuild from 'rollup-plugin-esbuild';

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import postcss from 'rollup-plugin-postcss';
import resolve from '@rollup/plugin-node-resolve';

import { getPackageEntryPoints } from './getPackageEntryPoints';

import getPrefixedLogger from '../../utils/getPrefixedLogger';
import getPackageMetadata from '../../utils/getPackageMetadata';
import getModularRoot from '../../utils/getModularRoot';
import getRelativeLocation from '../../utils/getRelativeLocation';
import createEsbuildBrowserslistTarget from '../../utils/createEsbuildBrowserslistTarget';

import type { ModularPackageJson } from 'modular-types';

const outputDirectory = 'dist';
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

function distinct<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export async function makeBundle(
  packageName: string,
  preserveModules: boolean,
  includePrivate: boolean,
): Promise<ModularPackageJson> {
  const modularRoot = getModularRoot();
  const metadata = await getPackageMetadata();
  const {
    rootPackageJsonDependencies,
    packageJsons,
    packageJsonsByPackagePath,
    packageNames,
  } = metadata;

  const paramCaseTarget = toParamCase(packageName);
  const packagePath = await getRelativeLocation(packageName);
  const targetOutputDirectory = path.join(
    modularRoot,
    outputDirectory,
    paramCaseTarget,
  );

  const logger = getPrefixedLogger(packageName);

  const packageJson = packageJsonsByPackagePath[packagePath];

  const main = await getPackageEntryPoints(packagePath, includePrivate);

  logger.log(`building ${packageName}...`);

  const target = createEsbuildBrowserslistTarget(packagePath);

  const bundle = await rollup.rollup({
    input: path.join(modularRoot, packagePath, main),
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
      esbuild({
        target,
        minify: false,
        include: [`packages/**/*`],
        exclude: 'node_modules/**',
      }),
      postcss({ extract: false }),
      // TODO: add sass, dotenv
      json(),
    ],
    // TODO: support for css modules, sass, dotenv,
    // and anything else create-react-app supports
    // (alternatively, disable support for those in apps)
  });

  const absolutePackagePath = path.join(modularRoot, packagePath);

  const outputOptions: rollup.OutputOptions = {
    freeze: false,
    sourcemap: true, // TODO: read this off env
    sourcemapPathTransform(relativeSourcePath: string, sourceMapPath: string) {
      // make source map input files relative to the `${packagePath}/dist-${format}` within
      // the package directory

      const absoluteSourcepath = path.resolve(
        path.dirname(sourceMapPath),
        relativeSourcePath,
      );
      const packageRelativeSourcePath = path.relative(
        absolutePackagePath,
        absoluteSourcepath,
      );

      return `../${packageRelativeSourcePath}`;
    },
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

  // get all the names of the files we outputted to make sure they're included
  // in the missing dep check
  const chunkOrAssetFileNames = new Set<string>(
    output.map((chunkOfAsset) => chunkOfAsset.fileName),
  );

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
          if (
            includePrivate ||
            packageJsons[importedPackage].private !== true
          ) {
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
              if (
                !builtinModules.includes(importedPackage) &&
                // In the case that the importedPackage is contained in the
                // files outputted by the bundle write then the import name
                // is a dynamic import which generated a file split. This is
                // perfectly file since we know the file exists from the bundle
                // write phase.
                !chunkOrAssetFileNames.has(importedPackage)
              ) {
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
    missingDependenciesWithoutLocalFileNames.forEach((missingImport) => {
      logger.error(`  ${missingImport}`);
    });
    throw new Error(`Missing dependencies found.`);
  }

  // now actually write the bundles to disk
  // TODO: write to disk in the above check itself to prevent this 2nd pass
  const { output: buildOutput } = await bundle.write({
    ...outputOptions,
    ...(preserveModules
      ? {
          preserveModules: true,
          dir: path.join(targetOutputDirectory, `${outputDirectory}-cjs`),
        }
      : {
          file: path.join(
            targetOutputDirectory,
            `${outputDirectory}-cjs`,
            paramCaseTarget + '.cjs.js',
          ),
        }),
    format: 'cjs',
    exports: 'auto',
  });

  await bundle.write({
    ...outputOptions,
    ...(preserveModules
      ? {
          preserveModules: true,
          dir: path.join(targetOutputDirectory, `${outputDirectory}-es`),
        }
      : {
          file: path.join(
            targetOutputDirectory,
            `${outputDirectory}-es`,
            paramCaseTarget + '.es.js',
          ),
        }),
    format: 'es',
    exports: 'auto',
  });

  const outputPath = buildOutput[0].fileName;

  // return the public facing package.json that we'll write to disk later
  return {
    ...packageJson,
    main: preserveModules
      ? path.posix.join(`${outputDirectory}-cjs`, outputPath)
      : `${outputDirectory}-cjs/${paramCaseTarget + '.cjs.js'}`,
    module: preserveModules
      ? path.posix.join(`${outputDirectory}-es`, outputPath)
      : `${outputDirectory}-es/${paramCaseTarget + '.es.js'}`,
    typings: path.posix.join(
      `${outputDirectory}-types`,
      path.posix.relative('src', main).replace(/\.tsx?$/, '.d.ts'),
    ),
    dependencies: {
      ...packageJson.dependencies,
      ...localImports,
    },
    files: distinct([
      ...(packageJson.files || []),
      'dist-cjs',
      'dist-es',
      'dist-types',
      'README.md',
    ]),
  };
}
