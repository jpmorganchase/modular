#!/usr/bin/env node

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

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
// See https://github.com/facebook/create-react-app/blob/f36d61a/packages/react-scripts/bin/react-scripts.js#L11-L16
process.on('unhandledRejection', (err) => {
  throw err;
});

const cracoBin = resolveAsBin('craco');
const jestBin = resolveAsBin('jest');
const cracoConfig = path.join(__dirname, '..', 'craco.config.js');

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

function isYarnInstalled(): boolean {
  try {
    execa.sync('yarnpkg', ['-v']);
    return true;
  } catch (err) {
    return false;
  }
}

type PackageType = 'app' | 'view' | 'root'; // | 'package', the default

export interface PackageJson {
  name: string;
  private?: boolean;
  modular?: {
    type: PackageType;
  };
}

function isModularType(dir: string, type: PackageType) {
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath) as PackageJson;
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

function run() {
  const help = `
  Usage:
    $ modular check
    $ modular add <package-name>
    $ modular start
    $ modular build
    $ modular test
`;

  if (isYarnInstalled() === false) {
    console.error(
      'Please install `yarn` before attempting to run `modular-scripts`.',
    );
    process.exit(1);
  }

  const argv = mri(process.argv.slice(2));

  const command = argv._[0];
  try {
    switch (command) {
      case 'add':
        return addPackage(argv._[1], argv['unstable-type'] as string | void);
      case 'test':
        return test(process.argv.slice(3));
      case 'start':
        return start(argv._[1]);
      case 'build':
        return build(argv._[1]);
      case 'check':
        return check();
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

function test(args: string[]) {
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

function build(appPath: string) {
  const modularRoot = getModularRoot();

  if (!isModularType(path.join(modularRoot, 'packages', appPath), 'app')) {
    throw new Error(`The package at ${appPath} is not a valid modular app.`);
  }

  execSync(cracoBin, ['build', '--config', cracoConfig], {
    cwd: path.join(modularRoot, 'packages', appPath),
    log: false,
    // @ts-ignore
    env: {
      MODULAR_ROOT: modularRoot,
    },
  });
}

type VerifyPackageTree = () => void;

function check() {
  const verifyPackageTree = require('react-scripts/scripts/utils/verifyPackageTree') as VerifyPackageTree; // eslint-disable-line @typescript-eslint/no-var-requires
  verifyPackageTree();
  // Unlike CRA, let's NOT verify typescript config when running tests.
  console.log(chalk.greenBright(`All Good!`));
}

try {
  if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
    check();
  }

  void run();
} catch (err) {
  console.error(err);
}
