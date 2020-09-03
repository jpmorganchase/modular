#!/usr/bin/env node

import { argv } from 'yargs';
import execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import {
  pascalCase as toPascalCase,
  paramCase as toParamCase,
} from 'change-case';
import inquirer from 'inquirer';
import resolveAsBin from 'resolve-as-bin';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';

import { getModularRoot } from './getModularRoot';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
// See https://github.com/facebook/create-react-app/blob/f36d61a/packages/react-scripts/bin/react-scripts.js#L11-L16
process.on('unhandledRejection', (err) => {
  throw err;
});

const cracoBin = resolveAsBin('craco');
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

type PackageType = 'app' | 'widget' | 'root'; // | 'package', the default

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

  const command = argv._[0];
  switch (command) {
    case 'add':
      return addPackage(argv._[1], argv.template as string | void);
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
}

async function addPackage(name: string, templateArg: string | void) {
  const template =
    templateArg ||
    ((await inquirer.prompt([
      {
        name: 'template',
        type: 'list',
        message: 'What kind of package would you like to add?',
        choices: [
          { name: 'A normal package', value: 'package' },
          { name: 'A React Component', value: 'widget' },
          { name: 'A new application', value: 'app' },
        ],
      },
    ])) as { template: string }).template;

  if (template === 'app') {
    addApp(name);
    return;
  }

  const modularRoot = getModularRoot();

  const newPackageName = toParamCase(name);
  const newComponentName = toPascalCase(name);

  const newPackagePath = path.join(modularRoot, 'packages', newPackageName);
  const packageTemplatePath = path.join(__dirname, '../templates', template);

  // create a new package source folder
  if (fs.existsSync(newPackagePath)) {
    console.error(`The package named ${name} already exists!`);
    process.exit(1);
  }

  fs.mkdirpSync(newPackagePath);
  fs.copySync(packageTemplatePath, newPackagePath);

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
        .replace(/WidgetName__/g, newPackageName)
        .replace(/ComponentName__/g, newComponentName),
    );
  }

  execSync('yarnpkg', [], { cwd: newPackagePath });
}

// keep this in sync with create-modular-react-app/src/cli.ts
function addApp(name: string) {
  const root = getModularRoot();
  const packagesPath = path.join(root, 'packages');
  const appPath = path.join(packagesPath, name);
  const appPackageJsonPath = path.join(appPath, 'package.json');
  const defaultTemplate = 'cra-template-modular-typescript';
  // const appTemplate = (argv.template ?? defaultTemplate) as string;
  // https://github.com/jpmorganchase/modular/issues/37
  // Holding off on using custom templates until we have
  // actual usecases.
  const appTemplate = defaultTemplate;

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
  fs.removeSync(path.join(appPath, 'yarn.lock'));
  fs.removeSync(path.join(appPath, 'README.md'));

  const appPackageJson = fs.readJsonSync(
    appPackageJsonPath,
  ) as JSONSchemaForNPMPackageJsonFiles;
  delete appPackageJson['scripts'];
  delete appPackageJson['eslintConfig'];
  appPackageJson.private = true;
  appPackageJson.modular = { type: 'app' };
  fs.writeJsonSync(appPackageJsonPath, appPackageJson, { spaces: 2 });
}

function test(args: string[]) {
  const modularRoot = getModularRoot();

  return execSync(cracoBin, ['test', '--config', cracoConfig, ...args], {
    cwd: path.join(modularRoot, 'packages', 'app'),
    log: false,
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
  });
}

try {
  void run();
} catch (err) {
  console.error(err);
}
