#!/usr/bin/env node

import mri from 'mri';
import execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import {
  pascalCase as toPascalCase,
  paramCase as toParamCase,
} from 'change-case';
import prompts from 'prompts';
import resolveAsBin from 'resolve-as-bin';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';

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

function run() {
  const help = `
  Usage:
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
        message: `What kind of package is ${name}? Huh?`,
        choices: [
          { title: 'A plain package', value: 'package' },
          { title: 'A view within an application', value: 'view' },
          { title: 'A standalone application', value: 'app' },
        ],
        initial: 0,
      },
    ])) as { type: string }).type;

  if (type === 'app') {
    addApp(name);
    return;
  }

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

  const packageRootFilePaths = fs
    .readdirSync(newPackagePath, { withFileTypes: true })
    .filter((entry: fs.Dirent) => entry.isDirectory() === false)
    .map((file: fs.Dirent) => path.join(newPackagePath, file.name));

  for (const packageFilePath of packageRootFilePaths) {
    fs.writeFileSync(
      packageFilePath,
      fs
        .readFileSync(packageFilePath, 'utf8')
        .replace(/PackageName__/g, newPackageName)
        .replace(/ViewName__/g, newPackageName)
        .replace(/ComponentName__/g, newComponentName),
    );
  }

  execSync('yarnpkg', [], { cwd: newPackagePath });
}

function addApp(name: string) {
  const modularRoot = getModularRoot();
  const packagesPath = path.join(modularRoot, 'packages');
  const appPath = path.join(packagesPath, name);
  const appPackageJsonPath = path.join(appPath, 'package.json');
  const appTemplate =
    'file:' + path.join(__dirname, '../cra-template-modular-typescript');

  if (fs.existsSync(appPath)) {
    console.error(`The package named ${name} already exists!`);
    process.exit(1);
  }

  execSync(
    'yarnpkg',
    ['create', 'react-app', name, '--template', appTemplate],
    {
      cwd: packagesPath,
    },
  );
  fs.removeSync(path.join(appPath, '.gitignore'));
  fs.removeSync(path.join(appPath, '.git'));
  // Technically a `yarn.lock` file isn't created because
  // the dependencies are installed into Modular's root
  // `yarn.lock` file, and therefore during the installation
  // of the template `npm` is used instead and a `package-lock.json`
  // file is created.
  //
  // See: https://github.com/facebook/create-react-app/blob/2da5517689b7510ff8d8b0148ce372782cb285d7/packages/react-scripts/scripts/init.js#L92
  fs.removeSync(path.join(appPath, 'yarn.lock'));
  fs.removeSync(path.join(appPath, 'package-lock.json'));
  fs.removeSync(path.join(appPath, 'README.md'));

  const appPackageJson = fs.readJsonSync(
    appPackageJsonPath,
  ) as JSONSchemaForNPMPackageJsonFiles;

  delete appPackageJson.scripts;
  delete appPackageJson.eslintConfig;
  if (appPackageJson.dependencies !== undefined) {
    delete appPackageJson.dependencies['react-scripts'];
  }
  appPackageJson.private = true;
  appPackageJson.modular = { type: 'app' };

  fs.writeJsonSync(appPackageJsonPath, appPackageJson, { spaces: 2 });
}

function test(args: string[]) {
  const modularRoot = getModularRoot();

  const argv = mri(process.argv.slice(3))._.concat([
    '--config',
    path.join(__dirname, '..', 'jest-config.js'),
  ]);

  // Watch unless on CI or explicitly running all tests
  if (!process.env.CI && args.indexOf('--watchAll=false') === -1) {
    // https://github.com/facebook/create-react-app/issues/5210
    argv.push('--watchAll');
  }

  return execSync(jestBin, argv, {
    cwd: modularRoot,
    log: false,
    cleanup: true,
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

try {
  void run();
} catch (err) {
  console.error(err);
}
