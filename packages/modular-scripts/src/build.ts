// While working on this file, be aware that builds
// could be happening simultaneously across packages, so
// try be 'thread-safe'. No state outside of functions

import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import { JSONSchemaForTheTypeScriptCompilerSConfigurationFile as TSConfig } from '@schemastore/tsconfig';

import { promisify as prom } from 'util';

import * as rollup from 'rollup';
import rimraf from 'rimraf';
import * as path from 'path';
import { extract } from 'tar';

import execa from 'execa';

import postcss from 'rollup-plugin-postcss';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';

import * as ts from 'typescript';
import * as fse from 'fs-extra';

import builtinModules from 'builtin-modules';

// from https://github.com/Microsoft/TypeScript/issues/6387
// a helper to output a readable message from a ts diagnostics object
function reportTSDiagnostics(diagnostics: ts.Diagnostic[]): void {
  diagnostics.forEach((diagnostic) => {
    let message = 'Error';
    if (diagnostic.file) {
      const where = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start as number,
      );
      message += ` ${diagnostic.file.fileName} ${where.line}, ${
        where.character + 1
      }`;
    }
    message +=
      ': ' + ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    console.log(message);
  });
}

const extensions = ['.js', '.jsx', '.ts', '.tsx'];
const outputDirectory = 'dist';
const typescriptConfigFilename = 'tsconfig.json';
const packagesRoot = 'packages';

// list of all directories under packages
const packageDirectoryNames = fse
  .readdirSync(packagesRoot, { withFileTypes: true })
  .filter((directoryEntry) => directoryEntry.isDirectory())
  .map((directory) => directory.name);

// dependencies defined at the root
const rootPackageJsonDependencies =
  (fse.readJSONSync('package.json') as PackageJson).dependencies || {};

// a map of all package.json contents, indexed by package name
const packageJsons: { [key: string]: PackageJson } = {};
// a map of all package.json contents, indexed by directory name
const packageJsonsByDirectoryName: {
  [key: string]: PackageJson;
} = {};

// let's populate the above two
for (let i = 0; i < packageDirectoryNames.length; i++) {
  const pathToPackageJson = path.join(
    packagesRoot,
    packageDirectoryNames[i],
    'package.json',
  );
  if (fse.existsSync(pathToPackageJson)) {
    const packageJson = fse.readJsonSync(pathToPackageJson) as PackageJson;
    // TODO: throw if there isn't a name?
    packageJsons[packageJson.name as string] = packageJson;
    packageJsonsByDirectoryName[packageDirectoryNames[i]] = packageJson;
  }
}

const publicPackageJsons: {
  [name: string]: PackageJson;
} = {};

const typescriptConfig: TSConfig = {};
// validate tsconfig
{
  // Extract configuration from config file and parse JSON,
  // after removing comments. Just a fancier JSON.parse
  const result = ts.parseConfigFileTextToJson(
    typescriptConfigFilename,
    fse.readFileSync(typescriptConfigFilename, 'utf8').toString(),
  );

  const configObject = result.config as TSConfig;

  if (!configObject) {
    reportTSDiagnostics([result.error as ts.Diagnostic]);
    throw new Error('Failed to load Typescript configuration');
  }

  Object.assign(typescriptConfig, configObject);

  Object.assign(typescriptConfig.compilerOptions, {
    declarationDir: outputDirectory,
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    incremental: false,
  });

  Object.assign(typescriptConfig, {
    exclude: [
      // all TS test files, regardless whether co-located or in test/ etc
      '**/*.stories.ts',
      '**/*.stories.tsx',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.e2e.ts',
      '**/*.spec.tsx',
      '**/*.test.tsx',
      '__tests__',
      // TS defaults below
      'node_modules',
      'bower_components',
      'jspm_packages',
      'tmp',
    ],
  });
}

async function makeBundle(directoryName: string): Promise<boolean> {
  // TODO: - run whatever's in its scripts.build field too?
  // TODO: verify that directoryName is in packageDirectoryNames

  const packageJson = packageJsonsByDirectoryName[directoryName];

  if (!packageJson) {
    console.log(`no package.json in packages/${directoryName}, bailing...`);
    return false;
  }
  if (packageJson.private === true) {
    console.log(`packages/${directoryName} is marked private, bailing...`);
    return false;
  }

  console.log(
    `building ${packageJson.name as string} at packages/${directoryName}...`,
  );

  const bundle = await rollup.rollup({
    // TODO: verify that .main exists
    input: path.join(packagesRoot, directoryName, packageJson.main as string),
    external: (id) => {
      // via tsdx
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
          ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
          '@babel/preset-react',
          [
            '@babel/preset-env',
            {
              // targets: { esmodules: true }, // Use the targets that you was already using
              // bugfixes: true, // will be default in Babel 8
            },
          ],
        ],
        plugins: ['@babel/plugin-proposal-class-properties'],
        extensions,
        include: [`${packagesRoot}/**/*`],
        exclude: 'node_modules/**',
      }),
      postcss({ extract: false, modules: true }),
      // TODO: add sass, css modules, dotenv
      json(),
      {
        // via tsdx
        // Custom plugin that removes shebang from code because newer
        // versions of bublé bundle their own private version of `acorn`
        // and I don't know a way to patch in the option `allowHashBang`
        // to acorn. Taken from microbundle.
        // See: https://github.com/Rich-Harris/buble/pull/165
        name: 'strip-shebang',
        transform(code) {
          code = code.replace(/^#!(.*)/, '');

          return {
            code,
            map: null,
          };
        },
      },
    ],
    // TODO: support for css modules, sass, dotenv,
    // and anything else create-react-app supports
    // (alternatively, disable support for those in apps)
  });

  const outputOptions = {
    freeze: false,
    sourcemap: true, // TODO: read this off env
    globals: { react: 'React', 'react-native': 'ReactNative' }, // why?
  };

  // we're going to use bundle.write() to actually generate the
  // output files, but first we're going to do a scan
  // to validate dependencies and collect some metadata for later
  const { output } = await bundle.generate(outputOptions);
  // TODO: we should use this loop to generate the files itself
  // to avoid the second scan, but it's ok for now I guess.

  // "local" workspaces/packages that were imported, i.e - packages/*
  const localImports: { [name: string]: string } = {};

  // imports that aren't defined in package.json or root package.json
  // Now, this will also mark dependencies that were transient/nested,
  // but I think that's the right choice; a dependency might remove it,
  // even in a patch, and it'll break your code and you wouldn't know why.
  const missingDependencies: string[] = [];

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
        // TODO: we should probably throw an error if you try to reference
        // an inner module from a separate workspace, until we land support
        // for multiple entry points
        const importedPath = imported.split('/');
        const importedPackage =
          // scoped package?
          importedPath[0][0] === '@'
            ? `${importedPath[0]}/${importedPath[1]}`
            : // non-scoped
              importedPath[0];

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
                missingDependencies.push(importedPackage);
              }
            }
          }
        }
      }
    }
  }
  if (Object.keys(localImports).length > 0) {
    console.log('Adding these dependencies to the generated packages.json:');
    console.log(localImports);
  }

  if (missingDependencies.length > 0) {
    throw new Error(
      `Missing dependencies: ${missingDependencies.join(', ')};`, // TODO: lineNo, filename
    );
  }

  // now actually write the bundles to disk
  // TODO: write to disk in the above check itself to prevent this 2nd pass

  await bundle.write({
    ...outputOptions,
    preserveModules: true,
    dir: path.join(
      packagesRoot,
      directoryName,
      outputDirectory,
      'cjs',
      path.dirname(packageJson.main as string),
    ),
    format: 'cjs',
  });

  await bundle.write({
    ...outputOptions,
    preserveModules: true,
    dir: path.join(
      packagesRoot,
      directoryName,
      outputDirectory,
      'es',
      path.dirname(packageJson.main as string),
    ),
    format: 'es',
  });

  // store the public facing package.json that we'll write to disk later
  // TODO: We should probably warn that module/typings will be overwritten
  // if they're already specified
  publicPackageJsons[directoryName] = {
    ...packageJson,
    main: path.join(
      outputDirectory,
      'cjs',
      (packageJson.main as string).replace(/\.tsx?$/, '.js'),
    ),
    module: path.join(
      outputDirectory,
      'es',
      (packageJson.main as string).replace(/\.tsx?$/, '.js'),
    ),
    typings: path.join(
      outputDirectory,
      'types',
      (packageJson.main as string).replace(/\.tsx?$/, '.d.ts'),
    ),
    dependencies: {
      ...packageJson.dependencies,
      ...localImports,
    },
    files: [...new Set([...(packageJson.files || []), '/dist'])],
  };

  console.log(`built ${directoryName}`);
  return true;
}

function makeTypings(packageDirectory: string) {
  console.log('generating .d.ts files for', packageDirectory);

  // make a shallow copy of the configuration
  const tsconfig: TSConfig = {
    ...typescriptConfig,
  };

  tsconfig.compilerOptions = {
    ...typescriptConfig.compilerOptions,
  };

  // then add our custom stuff
  tsconfig.include = [`${packagesRoot}/${packageDirectory}`];
  tsconfig.compilerOptions = {
    ...tsconfig.compilerOptions,
    declarationDir: `${packagesRoot}/${packageDirectory}/${outputDirectory}/types`,
    rootDir: `${packagesRoot}/${packageDirectory}`,
  };

  // Extract config information
  const configParseResult = ts.parseJsonConfigFileContent(
    tsconfig,
    ts.sys,
    path.dirname(typescriptConfigFilename),
  );

  if (configParseResult.errors.length > 0) {
    reportTSDiagnostics(configParseResult.errors);
    throw new Error('Could not parse Typescript configuration');
  }

  const host = ts.createCompilerHost(configParseResult.options);
  host.writeFile = (fileName, contents) => {
    fse.mkdirpSync(path.dirname(fileName));
    fse.writeFileSync(fileName, contents);
  };

  // Compile
  const program = ts.createProgram(
    configParseResult.fileNames,
    configParseResult.options,
    host,
  );

  const emitResult = program.emit();

  // Report errors
  // TODO: this should fail the build
  reportTSDiagnostics(
    ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics),
  );
}

async function cleanPackage(directoryName: string) {
  // delete packageName/dist
  await prom(rimraf)(path.join(packagesRoot, directoryName, outputDirectory));
}

export default async function buildPackage(
  directoryName: string,
): Promise<void> {
  // ensure the root build folder is ready
  await fse.mkdirp(outputDirectory);

  // delete any existing build folder, if at all
  await cleanPackage(directoryName);

  // generate the js files
  const didBundle = await makeBundle(directoryName);
  if (!didBundle) {
    return;
  }
  // then the .d.ts files
  makeTypings(directoryName);

  const originalPkgJsonContent = (await fse.readJson(
    path.join(packagesRoot, directoryName, 'package.json'),
  )) as PackageJson;

  // switch in the special package.json
  await fse.writeJson(
    path.join(packagesRoot, directoryName, 'package.json'),
    publicPackageJsons[directoryName],
    { spaces: 2 },
  );

  // TODO: this should fail if the tgz already exists?
  await execa(
    'yarnpkg',
    // TODO: verify this works on windows
    [
      'pack',
      '--filename',
      path.join(`../../${outputDirectory}`, directoryName + '.tgz'),
    ],
    {
      cwd: packagesRoot + '/' + directoryName,
      stdin: process.stdin,
      stderr: process.stderr,
      stdout: process.stdout,
    },
  );

  // now revert package.json
  await fse.writeJson(
    path.join(packagesRoot, directoryName, 'package.json'),
    originalPkgJsonContent,
    { spaces: 2 },
  );

  // cool. now unpack the tgz's contents in the root dist
  await fse.mkdirp(path.join(outputDirectory, directoryName));
  await extract({
    file: path.join(outputDirectory, directoryName + '.tgz'),
    strip: 1,
    C: path.join(outputDirectory, directoryName),
  });

  // delete the local dist folder
  await prom(rimraf)(path.join(packagesRoot, directoryName, outputDirectory));

  // if you're curious why we unpack it here, it's because
  // we observed problems with publishing tgz files directly to npm.

  // then delete the tgz
  await fse.remove(path.join(outputDirectory, directoryName + '.tgz'));
  /// and... that's it
}
