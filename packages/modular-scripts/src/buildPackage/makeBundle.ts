import builtinModules from 'builtin-modules';
import { paramCase as toParamCase } from 'change-case';
import * as esbuild from 'esbuild';
import * as path from 'path';
import chalk from 'chalk';
import nodeResolve from 'resolve';

import { getLogger } from './getLogger';
import { getPackageEntryPoints } from './getPackageEntryPoints';
import getPackageMetadata from '../utils/getPackageMetadata';
import getModularRoot from '../utils/getModularRoot';
import getPackageName from '../utils/getPackageName';
import getRelativeLocation from '../utils/getRelativeLocation';
import { ModularPackageJson } from '../utils/isModularType';

const outputDirectory = 'dist';
// It's important that .mjs is listed before .js so that we will interpret npm modules
// which deploy both ESM .mjs and CommonJS .js files as ESM.
const extensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx'];

const builtins = new Set(builtinModules);

function distinct<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

async function runEsbuild({
  packagePath,
  entryPoint,
  write,
  format = 'esm',
}: {
  packagePath: string;
  entryPoint: string;
  write: boolean;
  format?: esbuild.Format;
}) {
  const outExtension: { [ext: string]: string } | undefined =
    format === 'esm'
      ? {
          '.js': '.mjs',
        }
      : undefined;

  const dependencies: string[] = [];
  const queue: string[] = [];

  const packageName = await getPackageName(packagePath);

  const output = await esbuild.build({
    entryPoints: [entryPoint],
    write,
    bundle: true,
    sourcemap: true,
    outbase: path.join(getModularRoot(), packagePath, 'src'),
    outdir: path.join(
      getModularRoot(),
      'dist',
      toParamCase(packageName),
      `${outputDirectory}-${format}`,
    ),
    target: 'es2015',
    format,
    outExtension,
    plugins: [
      {
        name: 'pre-resolve',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            return new Promise<undefined | esbuild.OnResolveResult>(
              (resolve, reject) => {
                if (args.kind !== 'entry-point') {
                  if (args.path.startsWith('.')) {
                    if (path.parse(args.path).ext) {
                      const resolvedFile = path.join(
                        args.resolveDir,
                        args.path,
                      );
                      queue.push(resolvedFile);
                      resolve({
                        path: resolvedFile,
                        external: true,
                      });
                    } else {
                      nodeResolve(
                        args.path,
                        {
                          basedir: args.resolveDir,
                          extensions,
                        },
                        (err, resolvedFile) => {
                          if (err) {
                            reject(err);
                          } else {
                            if (resolvedFile) {
                              queue.push(resolvedFile);
                              resolve({
                                path: resolvedFile,
                                external: true,
                              });
                            } else {
                              reject(`${args.path} could not be resolved.`);
                            }
                          }
                        },
                      );
                    }
                  } else {
                    dependencies.push(args.path);
                    resolve({
                      path: args.path,
                      external: true,
                    });
                  }
                } else {
                  resolve(undefined);
                }
              },
            );
          });
        },
      },
    ],
  });

  return {
    output,
    queue,
    dependencies,
  };
}

async function runQueuedEsbuild({
  packagePath,
  entryPoint,
  write,
  format = 'esm',
}: {
  packagePath: string;
  entryPoint: string;
  write: boolean;
  format?: esbuild.Format;
}) {
  const logger = getLogger(packagePath);

  const queue: string[] = [entryPoint];
  const outputs = [];
  const dependencies: Set<string> = new Set();
  const compiled: Set<string> = new Set();

  while (queue.length) {
    const entryPoint = queue.splice(0, 1)[0];
    if (compiled.has(entryPoint)) {
      // we've already compiled this file and there's no problem becuase we don't need to compile it again
    } else {
      compiled.add(entryPoint);

      const logPrefix = write ? `Compiling [${format}]` : `Analyzing`;
      logger.debug(`${logPrefix} ${entryPoint}`);

      const out = await runEsbuild({
        packagePath,
        entryPoint,
        format,
        write,
      });
      outputs.push(out.output);
      queue.push(...out.queue);
      out.dependencies.forEach((dep) => {
        dependencies.add(dep);
      });
    }
  }

  return { outputs, compiled, dependencies: Array.from(dependencies) };
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
