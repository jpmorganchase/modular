#!/usr/bin/env node

import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import mri from 'mri';
import execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import resolve from 'resolve';
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
        );
      case 'test':
        return test(process.argv.slice(3));
      case 'start':
        return start(argv._[1]);
      case 'build':
        return buildParallel(
          argv._[1].split(','),
          argv['preserve-modules'] as boolean | undefined,
        );
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

async function addPackage(name: string, typeArg: string | void) {
  const type =
    typeArg ||
    ((await prompts([
      {
        name: 'type',
        type: 'select',
        message: `What kind of package is ${name}?`,
        choices: [
          { title: 'A plain package', value: 'package' },
          { title: 'A view within an application', value: 'view' },
          { title: 'A standalone application', value: 'app' },
        ],
        initial: 0,
      },
    ])) as { type: string }).type;

  const modularRoot = getModularRoot();

  const newPackageName = toParamCase(name);
  const newComponentName = toPascalCase(name);

  const newPackagePath = path.join(modularRoot, 'packages', newPackageName);
  const packageTypePath = path.join(__dirname, '../types', type);

  // create a new package source folder
  if (fs.existsSync(newPackagePath)) {
    console.error(`The package named ${name} already exists!`);
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
        .replace(/PackageName__/g, newPackageName)
        .replace(/ComponentName__/g, newComponentName),
    );
  }

  execSync('yarnpkg', [], { cwd: newPackagePath });
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

  return execSync(jestBin, argv, {
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

  if (!isModularType(path.join(modularRoot, 'packages', appPath), 'app')) {
    throw new Error(`The package at ${appPath} is not a valid modular app.`);
  }

  execSync(cracoBin, ['start', '--config', cracoConfig], {
    cwd: path.join(modularRoot, 'packages', appPath),
    log: false,
    // @ts-ignore
    env: {
      MODULAR_ROOT: modularRoot,
    },
  });
}

// run builds in parallel
async function buildParallel(
  directoryNames: string[],
  preserveModules?: boolean,
) {
  const result = await Promise.allSettled(
    directoryNames.map((name) => build(name, preserveModules)),
  );
  const error = result.find((result) => result.status === 'rejected');
  if (error) throw error;
}

async function build(directoryName: string, preserveModules?: boolean) {
  const modularRoot = getModularRoot();

  if (isModularType(path.join(modularRoot, 'packages', directoryName), 'app')) {
    // create-react-app doesn't support plain module outputs yet,
    // so --preserve-modules has no effect here
    await fs.remove(`dist/${directoryName}`);
    // TODO: this shouldn't be sync
    execSync(cracoBin, ['build', '--config', cracoConfig], {
      cwd: path.join(modularRoot, 'packages', directoryName),
      log: false,
      // @ts-ignore
      env: {
        MODULAR_ROOT: modularRoot,
      },
    });

    await fs.move(`packages/${directoryName}/build`, `dist/${directoryName}`);
  } else {
    // it's a view/package, run a library build
    const { build } = await import('./build');
    // ^ we do a dynamic import here to defer the module's initial side effects
    // till when it's actually needed (i.e. now)
    await build(directoryName, preserveModules);
  }
}

void run().catch((err) => {
  // todo - cleanup on errors
  console.error(err);
  process.exit(1);
});
