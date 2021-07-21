import builtinModules from 'builtin-modules';
import { paramCase as toParamCase } from 'change-case';
import * as path from 'path';
import chalk from 'chalk';

import { getLogger } from './getLogger';
import { getPackageEntryPoints } from './getPackageEntryPoints';
import getPackageMetadata from '../utils/getPackageMetadata';
import getModularRoot from '../utils/getModularRoot';
import getRelativeLocation from '../utils/getRelativeLocation';
import { ModularPackageJson } from '../utils/isModularType';

import runQueuedEsbuild from './runQueuedEsbuild';

// It's important that .mjs is listed before .js so that we will interpret npm modules
// which deploy both ESM .mjs and CommonJS .js files as ESM.
const extensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx'];

const outputDirectory = 'dist';

const builtins = new Set(builtinModules);

function distinct<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export async function makeBundle(
  target: string,
  preserveModules: boolean,
  includePrivate: boolean,
): Promise<ModularPackageJson> {
  const packagePath = await getRelativeLocation(target);
  const modularRoot = getModularRoot();
  const metadata = await getPackageMetadata();
  const {
    rootPackageJsonDependencies,
    packageJsons,
    packageJsonsByPackagePath,
    packageNames,
  } = metadata;
  const logger = getLogger(packagePath);

  const packageJson = packageJsonsByPackagePath[packagePath];

  const { main, compilingBin } = await getPackageEntryPoints(
    packagePath,
    includePrivate,
  );

  const packageJsonName = packageJson.name as string;
  logger.log(`building ${packageJsonName} at ${packagePath}...`);

  const entryPoint = path.join(modularRoot, packagePath, main);

  const out = await runQueuedEsbuild({
    packagePath,
    entryPoint,
    write: false,
  });

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

  for (const imported of out.dependencies) {
    // get the dependency (without references any inner modules)
    const importedPath = imported.split('/');
    const importedPackage =
      // scoped package?
      importedPath[0][0] === '@'
        ? `${importedPath[0]}/${importedPath[1]}`
        : // non-scoped
          importedPath[0];

    if (importedPackage === target) {
      // we allow for the package to import itself to avoid fs.readFile situations
      // this is imported for modular-scripts itself so that configuration
      // files can be read.
      continue;
    } else {
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
          throw new Error(`referencing a private package: ${importedPackage}`); // TODO - lineNo, filename
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
            if (!builtins.has(importedPackage)) {
              // save filename to remove from missingDeps later
              // if they exist there
              missingDependencies.add(importedPackage);
            }
          }
        }
      }
    }
  }

  // remove local filenames from missingDependencies
  const missingDependenciesWithoutLocalFileNames = [
    ...missingDependencies,
  ].filter((dep) => !localFileNames.has(dep));

  if (missingDependenciesWithoutLocalFileNames.length > 0) {
    throw new Error(
      `Missing dependencies: ${missingDependenciesWithoutLocalFileNames.join(
        ', ',
      )};`,
    );
  }

  if (Object.keys(localImports).length > 0) {
    logger.log('Adding dependencies to the generated package.json:');
    Object.entries(localImports).forEach(([packageName, packageVersion]) => {
      logger.log(`\t${packageName}: ${chalk.green(packageVersion)}`);
    });
  }

  await runQueuedEsbuild({
    packagePath,
    entryPoint,
    format: 'esm',
    write: true,
  });

  await runQueuedEsbuild({
    packagePath,
    entryPoint,
    format: 'cjs',
    write: true,
  });

  let outputFilesPackageJson: Partial<ModularPackageJson>;
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
        : `${outputDirectory}-cjs/${toParamCase(packageJsonName) + '.js'}`,
      module: preserveModules
        ? path.join(
            `${outputDirectory}-es`,
            main
              .replace(/\.tsx?$/, '.js')
              .replace(path.dirname(main) + '/', ''),
          )
        : `${outputDirectory}-es/${toParamCase(packageJsonName) + '.mjs'}`,
      typings: path.join(
        `${outputDirectory}-types`,
        path.relative('src', main).replace(/\.tsx?$/, '.d.ts'),
      ),
    };
  }

  logger.log(`built ${packageJsonName} at ${packagePath}`);

  // return the public facing package.json that we'll write to disk later
  return {
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
}
