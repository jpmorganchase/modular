#!/usr/bin/env node

import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import mri from 'mri';
import execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import resolve from 'resolve';
import waitOn from 'wait-on';
import terminate from 'terminate';

import {
  pascalCase as toPascalCase,
  paramCase as toParamCase,
} from 'change-case';
import prompts from 'prompts';
import resolveAsBin from 'resolve-as-bin';

import getModularRoot from './getModularRoot';
import preflightCheck from './preflightCheck';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
// See https://github.com/facebook/create-react-app/blob/f36d61a/packages/react-scripts/bin/react-scripts.js#L11-L16
process.on('unhandledRejection', (err) => {
  throw err;
});

const packagesRoot = 'packages';
const outputDirectory = 'dist';

const cracoBin = resolveAsBin('craco');
const jestBin = resolveAsBin('jest');
const cracoConfig = path.join(
  __dirname,
  '..',
  'DO_NOT_IMPORT_THIS_OR_YOU_WILL_BE_FIRED_craco.config.js',
);

function execSync(
  file: string,
  args: string[],
  options: { log?: boolean } & execa.SyncOptions = { log: true },
) {
  const { log, ...opts } = options;
  if (log) {
    console.log(chalk.grey(`$ ${file} ${args.join(' ')}`));
  }
  return execa.sync(file, args, {
    stdin: process.stdin,
    stderr: process.stderr,
    stdout: process.stdout,
    cleanup: true,
    ...opts,
  });
}

type PackageType = 'app' | 'view' | 'root'; // | 'package', the default

type ModularPackageJson = PackageJson & {
  modular?: {
    type: PackageType;
  };
};

function isModularType(dir: string, type: PackageType) {
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath) as ModularPackageJson;
    return packageJson.modular?.type === type;
  }
  return false;
}

function isModularPackage(dir: string) {
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath) as ModularPackageJson;
    return !!packageJson.modular?.type;
  }
  return false;
}

// recursively get all files in a folder
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(function (file) {
    const pathToCheck = path.join(dirPath, file);
    if (fs.statSync(pathToCheck).isDirectory()) {
      arrayOfFiles = getAllFiles(pathToCheck, arrayOfFiles);
    } else {
      arrayOfFiles.push(pathToCheck);
    }
  });

  return arrayOfFiles;
}

async function run() {
  const help = `
  Usage:

    $ modular add <package-name>
    $ modular start
    $ modular build
    $ modular test
    $ modular init-e2e
    $ modular e2e
`;

  await preflightCheck();

  const argv = mri(process.argv.slice(2));

  const command = argv._[0];
  try {
    switch (command) {
      case 'add':
        return addPackage(
          argv._[1],
          argv['unstable-type'] as string | undefined,
          argv['unstable-name'] as string | undefined,
        );
      case 'test':
        return test(process.argv.slice(3));
      case 'start':
        return start(argv._[1]);
      case 'build':
        return buildSequential(
          argv._[1].split(','),
          argv['preserve-modules'] as boolean | undefined,
        );
      case 'init-e2e':
        return initE2E(argv._[1]);
      case 'e2e':
          return runE2E();
      default:
        console.log(help);
        process.exit(1);
    }
  } catch (err) {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    // When there is an `execa` Error with an `.exitCode` the
    // error message will already have been printed out by the
    // process so we only need to bail with the exit code.
    if (err.exitCode !== undefined) {
      process.exit(err.exitCode);
    }
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    throw err;
  }
}

async function addPackage(
  destination: string,
  typeArg: string | void,
  nameArg: string | void,
) {
  const { type, name } =
    (typeArg && nameArg ? { type: typeArg, name: nameArg } : null) ||
    ((await prompts([
      {
        name: 'name',
        type: 'text',
        message: `What would you like to name this package?`,
        initial: toParamCase(destination),
      },
      {
        name: 'type',
        type: 'select',
        message: `What kind of package is this?`,
        choices: [
          { title: 'A plain package', value: 'package' },
          { title: 'A view within an application', value: 'view' },
          { title: 'A standalone application', value: 'app' },
        ],
        initial: 0,
      },
    ])) as { type: string; name: string });

  const modularRoot = getModularRoot();
  const newComponentName = toPascalCase(name);

  const newPackagePath = path.join(modularRoot, packagesRoot, destination);
  const packageTypePath = path.join(__dirname, '../types', type);

  // create a new package source folder
  if (fs.existsSync(newPackagePath)) {
    console.error(`A package already exists at ${destination}!`);
    process.exit(1);
  }

  fs.mkdirpSync(newPackagePath);
  fs.copySync(packageTypePath, newPackagePath);

  const packageFilePaths = getAllFiles(newPackagePath);

  for (const packageFilePath of packageFilePaths) {
    fs.writeFileSync(
      packageFilePath,
      fs
        .readFileSync(packageFilePath, 'utf8')
        .replace(/PackageName__/g, name)
        .replace(/ComponentName__/g, newComponentName),
    );
    if (path.basename(packageFilePath) === 'packagejson') {
      // we've named package.json as packagejson in these templates
      fs.moveSync(
        packageFilePath,
        packageFilePath.replace('packagejson', 'package.json'),
      );
    }
  }

  if (type === 'app') {
    // add a tsconfig, because CRA expects it
    await fs.writeJSON(
      path.join(newPackagePath, 'tsconfig.json'),
      {
        extends: path.relative(newPackagePath, modularRoot) + '/tsconfig.json',
      },
      { spaces: 2 },
    );
  }

  execSync('yarnpkg', [], { cwd: newPackagePath });
  execSync('yarnpkg', [], { cwd: modularRoot });
}

type VerifyPackageTree = () => void;

function test(args: string[]) {
  if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
    const verifyPackageTree = require('react-scripts/scripts/utils/verifyPackageTree') as VerifyPackageTree; // eslint-disable-line @typescript-eslint/no-var-requires
    verifyPackageTree();
  }

  const modularRoot = getModularRoot();

  let argv = process.argv
    .slice(3)
    .concat(['--config', path.join(__dirname, '..', 'jest-config.js')]);

  // Watch unless on CI or explicitly running all tests
  if (!process.env.CI && args.indexOf('--watchAll=false') === -1) {
    // https://github.com/facebook/create-react-app/issues/5210
    argv.push('--watchAll');
  }

  // via https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/scripts/test.js

  // This is a very dirty workaround for https://github.com/facebook/jest/issues/5913.
  // We're trying to resolve the environment ourselves because Jest does it incorrectly.
  // TODO: remove this as soon as it's fixed in Jest.

  function resolveJestDefaultEnvironment(name: string) {
    const jestDir = path.dirname(
      resolve.sync('jest', {
        basedir: __dirname,
      }),
    );
    const jestCLIDir = path.dirname(
      resolve.sync('jest-cli', {
        basedir: jestDir,
      }),
    );
    const jestConfigDir = path.dirname(
      resolve.sync('jest-config', {
        basedir: jestCLIDir,
      }),
    );
    return resolve.sync(name, {
      basedir: jestConfigDir,
    });
  }
  const cleanArgv = [];
  let env = 'jsdom';
  let next;
  do {
    next = argv.shift();
    if (next === '--env') {
      env = argv.shift() as string;
    } else if (next?.indexOf('--env=') === 0) {
      env = next.substring('--env='.length);
    } else {
      cleanArgv.push(next);
    }
  } while (argv.length > 0);
  // @ts-ignore
  argv = cleanArgv;
  let resolvedEnv;
  try {
    resolvedEnv = resolveJestDefaultEnvironment(`jest-environment-${env}`);
  } catch (e) {
    // ignore
  }
  if (!resolvedEnv) {
    try {
      resolvedEnv = resolveJestDefaultEnvironment(env);
    } catch (e) {
      // ignore
    }
  }
  const testEnvironment = resolvedEnv || env;
  argv.push('--env', testEnvironment || '');

  // ends the section copied from CRA

  let testBin = jestBin,
    testArgs = argv;

  if (argv.includes('--inspect-brk')) {
    // If we're trying to attach to a debugger, we need to run node
    // instead. This moves around the command line arguments for so.
    testBin = 'node';
    testArgs = [
      '--inspect-brk',
      jestBin,
      ...testArgs.filter((x) => x !== '--inspect-brk'),
    ];
  }

  return execSync(testBin, testArgs, {
    cwd: modularRoot,
    log: false,
    // @ts-ignore
    env: {
      BABEL_ENV: 'test',
      NODE_ENV: 'test',
      PUBLIC_URL: '',
      MODULAR_ROOT: modularRoot,
    },
  });
}

function start(appPath: string) {
  const modularRoot = getModularRoot();

  if (!isModularType(path.join(modularRoot, packagesRoot, appPath), 'app')) {
    throw new Error(`The package at ${appPath} is not a valid modular app.`);
  }

  execSync(cracoBin, ['start', '--config', cracoConfig], {
    cwd: path.join(modularRoot, packagesRoot, appPath),
    log: false,
    // @ts-ignore
    env: {
      MODULAR_ROOT: modularRoot,
    },
  });
}

// run builds sequentially
async function buildSequential(
  packagePaths: string[],
  preserveModules?: boolean,
) {
  console.log('building packages at:', packagePaths.join(', '));

  for (let i = 0; i < packagePaths.length; i++) {
    try {
      await build(packagePaths[i], preserveModules);
    } catch (err) {
      console.error(`building ${packagePaths[i]} failed`);
      throw err;
    }
  }
}

// currently assumes cypress/e2e tests are not set up at all.
async function initE2E(someArgs: string) {
  // TODO: possibly detect and alter/generate global build yml files to set up cypress.

  // TODO: check for user overrides and if the project is package or app.

  // TODO: if no override, detect what kind if package is package or app.

  // TODO: check if cypress is already set up

  if(isModularType('./', 'root')) {
    console.log(chalk.red('The "init-e2e" command can only be run inside a folder a modular type of "package", "view" or "app".'))
  } else if(isModularType('./', 'view')) {
    // TODO: e2e setup for views
    console.warn('E2E setup not implemented for views');
  } else if(isModularType('./', 'app')) {
    await execa.command('cypress open', {
      stderr: process.stderr,
      stdout: process.stdout
    });

  } else {  // assume we are in a package since it is the default.
    // TODO: detect if there is JSX in which we integrate storybook
    console.warn('E2E setup not implemented for packages');
  }
}

function getE2EEnabledPackagePaths() {
  const files = fs.readdirSync(packagesRoot);
  const packagePaths = [];
  for (const file of files) {
    const packagePath = path.join(packagesRoot, file);
    const stat = fs.lstatSync(packagePath);
    if(stat.isDirectory() && isModularPackage(packagePath)) {
      if(fs.readdirSync(packagePath).includes('cypress.json')) {
        packagePaths.push(packagePath);
      }
    }
  }
  return packagePaths;
}

async function runE2E() {
  if(isModularType('./', 'root')) {
    const e2eEnabledPackagePaths = getE2EEnabledPackagePaths()
    for(const packagePath of e2eEnabledPackagePaths) {
      // cypress should be installed in workspaces root node-modules
      const packageName = packagePath.split('/')[1];

      console.log(`"${packageName}": starting dev server`)
      const devServerProcess = execa.command(`BROWSER=none ./node_modules/.bin/modular start ./${packageName}`, { shell: true })
      await waitOn({ 
        timeout: 20000,
        resources: ['http://localhost:3000/index.html'],  // assuming port 3000 since all modular apps are created to run on it.
      })
      console.log(`"${packageName}": dev server started`)

      // Disable video for a speed up.
      execa.commandSync('../../node_modules/.bin/cypress run --config video=false', {
        stderr: process.stderr,
        stdout: process.stdout,
        cwd: packagePath
      })

      console.log(`"${packageName}": killing dev server`)
      terminate(devServerProcess.pid); // 'terminate' helps kill the child server process, https://github.com/sindresorhus/execa/issues/96
      console.log(`"${packageName}": killed dev server`)

      // TODO: collect all coverage and merge
    }
  } else {
    console.log('can only be run in a modular workspace in the root folder.')
  }
}

async function build(packagePath: string, preserveModules?: boolean) {
  const modularRoot = getModularRoot();

  if (isModularType(path.join(modularRoot, packagesRoot, packagePath), 'app')) {
    // create-react-app doesn't support plain module outputs yet,
    // so --preserve-modules has no effect here
    await fs.remove(path.join(outputDirectory, packagePath));
    // TODO: this shouldn't be sync
    execSync(cracoBin, ['build', '--config', cracoConfig], {
      cwd: path.join(modularRoot, packagesRoot, packagePath),
      log: false,
      // @ts-ignore
      env: {
        MODULAR_ROOT: modularRoot,
      },
    });

    await fs.move(
      path.join(packagesRoot, packagePath, 'build'),
      path.join(outputDirectory, packagePath),
    );
  } else {
    // it's a view/package, run a library build
    const { build } = await import('./build');
    // ^ we do a dynamic import here to defer the module's initial side effects
    // till when it's actually needed (i.e. now)
    await build(packagePath, preserveModules);
  }
}

void run().catch((err) => {
  // todo - cleanup on errors
  console.error(err);
  process.exit(1);
});
