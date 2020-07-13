#!/usr/bin/env node

import meow from 'meow';
import execa from 'execa';
import findUp from 'find-up';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import {
  pascalCase as toPascalCase,
  paramCase as toParamCase,
} from 'change-case';
import resolveAsBin from 'resolve-as-bin';
import generateComponentImports from './generateComponentImports';

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

function run() {
  const cli = meow({
    description: 'Dashboards for a new generation',
    help: `
  Usage:
    $ modular app <name>
    $ modular new <name>
    $ modular start
    $ modular build
    $ modular test
    $ modular map
`,
  });

  if (isYarnInstalled() === false) {
    console.error('Please install `yarn` before attempting to run `modular`.');
    process.exit(1);
  }

  const command = cli.input[0];
  switch (command) {
    case 'app':
      return app(cli.input[1]);
    case 'new':
      return widget(cli.input[1]);
    case 'test': {
      return test(process.argv.slice(3));
    }
    case 'start':
      return start();
    case 'build':
      return build();
    case 'map':
      return map();
    default:
      console.log(cli.help);
      process.exit(1);
  }
}

function app(name: string) {
  const modularRoot = findUpModularRoot();
  if (modularRoot !== undefined) {
    console.error(
      'It is not possible to create a new app within a modular repository.',
    );
    process.exit(1);
  }

  const newModularRoot = path.join(process.cwd(), name);
  const widgetsPath = path.join(newModularRoot, 'widgets');
  const appPath = path.join(newModularRoot, 'app');

  const projectPackageJsonPath = path.join(newModularRoot, 'package.json');
  const appPackageJsonPath = path.join(appPath, 'package.json');

  const templatePath = path.join(__dirname, '..', 'template');

  // Create a new CRA app, modify config for workspaces
  fs.mkdirpSync(newModularRoot);

  execSync('yarn', ['init', '-y'], {
    cwd: newModularRoot,
  });

  fs.writeJsonSync(projectPackageJsonPath, {
    ...fs.readJsonSync(projectPackageJsonPath),
    private: true,
    workspaces: ['app', 'widgets/*'],
    modular: {},
    scripts: {
      start: 'modular start',
      build: 'modular build',
      test: 'modular test',
      map: 'modular map',
      lint: 'eslint .',
      prettier: 'prettier --write .',
    },
    eslintConfig: {
      extends: 'modular',
    },
    prettier: {
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 80,
      proseWrap: 'always',
    },
  });

  execSync(
    'yarn',
    ['add', '-W', '--dev', 'prettier', 'modular', 'eslint-config-modular'],
    { cwd: newModularRoot },
  );

  // TODO: We should be able to delete this once we have a published version of the tool.
  execSync('yarn', ['add', '-W', '--dev', '@craco/craco'], {
    cwd: newModularRoot,
  });

  fs.mkdirpSync(widgetsPath);
  fs.copySync(
    path.join(templatePath, 'widgets/README.md'),
    path.join(widgetsPath, 'README.md'),
  );

  execSync('yarn', ['create', 'react-app', 'app'], {
    cwd: newModularRoot,
  });
  // TODO - this should use a ---template, which includes store.js
  // and doesn't include a service worker?
  fs.copySync(
    path.join(templatePath, 'app/store.js'),
    path.join(appPath, 'src/store.js'),
  );

  fs.moveSync(
    path.join(appPath, '.gitignore'),
    path.join(newModularRoot, '.gitignore'),
  );
  fs.removeSync(path.join(appPath, '.git'));
  fs.removeSync(path.join(appPath, 'yarn.lock'));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const appPackageJson = fs.readJsonSync(appPackageJsonPath);
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  delete appPackageJson['scripts'];
  delete appPackageJson['eslintConfig'];
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  fs.writeJsonSync(appPackageJsonPath, appPackageJson);

  map(newModularRoot);

  execSync('yarn', ['prettier'], {
    cwd: newModularRoot,
  });
  execSync('git', ['init'], { cwd: newModularRoot });

  // TODO - make an initial commit?
  execSync('git', ['add', '.'], { cwd: newModularRoot });
  execSync('git', ['commit', '-m', 'Initial commit'], {
    cwd: newModularRoot,
  });
}

function widget(name: string) {
  const modularRoot = getModularRoot();

  const newWidgetPackageName = toParamCase(name);
  const newWidgetComponentName = toPascalCase(name);

  const newWidgetPath = path.join(modularRoot, 'widgets', newWidgetPackageName);
  const templatePath = path.join(__dirname, '..', 'template');

  // create a new widget source folder
  if (fs.existsSync(newWidgetPath)) {
    console.error(`The widget named ${name} already exists!`);
    process.exit(1);
  }

  fs.mkdirpSync(newWidgetPath);
  fs.copySync(path.join(templatePath, 'widgets/starter'), newWidgetPath);

  const filePaths = fs
    .readdirSync(newWidgetPath, {
      withFileTypes: true,
    })
    .filter((entry) => entry.isDirectory() === false)
    .map((file) => path.join(newWidgetPath, file.name));

  for (const filePath of filePaths) {
    fs.writeFileSync(
      filePath,
      fs
        .readFileSync(filePath, 'utf8')
        .replace(/PackageName\$\$/g, newWidgetPackageName)
        .replace(/ComponentName\$\$/g, newWidgetComponentName),
    );
  }

  execSync('yarn', ['add', 'react', 'react-dom'], { cwd: newWidgetPath });

  map();

  execSync('yarn', ['prettier'], {
    cwd: modularRoot,
  });
}

function map(modularRoot = getModularRoot()) {
  fs.writeFileSync(
    path.join(modularRoot, 'app/src/widgets.js'),
    generateComponentImports(path.join(modularRoot, 'widgets')),
  );
}

function test(args: string[]) {
  const modularRoot = getModularRoot();

  map();

  return execSync(cracoBin, ['test', '--config', cracoConfig, ...args], {
    cwd: path.join(modularRoot, 'app'),
    log: false,
  });
}

function start() {
  const modularRoot = getModularRoot();

  map();

  execSync(cracoBin, ['start', '--config', cracoConfig], {
    cwd: path.join(modularRoot, 'app'),
    log: false,
  });
}

function build() {
  const modularRoot = getModularRoot();

  map();

  execSync(cracoBin, ['build', '--config', cracoConfig], {
    cwd: path.join(modularRoot, 'app'),
    log: false,
  });
}

function isModularRoot(packageJson: { modular?: Record<string, unknown> }) {
  return (
    typeof packageJson === 'object' &&
    packageJson.modular !== null &&
    typeof packageJson.modular === 'object'
  );
}

function findUpModularRoot() {
  return findUp.sync((directory: string) => {
    const packageJsonPath = path.join(directory, 'package.json');
    if (
      findUp.sync.exists(packageJsonPath) &&
      isModularRoot(fs.readJsonSync(packageJsonPath))
    ) {
      return packageJsonPath;
    }
    return;
  });
}

function getModularRoot(): string {
  try {
    const modularRoot = findUpModularRoot();
    if (modularRoot === undefined) {
      console.error('These commands must be run within a modular repository.');
      process.exit(1);
    }

    return path.dirname(modularRoot);
  } catch (err) {
    console.error(err);
    return process.exit(1);
  }
}

function isYarnInstalled(): boolean {
  try {
    execa.sync('yarn', ['-v']);
    return true;
  } catch (err) {
    return false;
  }
}

try {
  void run();
} catch (err) {
  console.error(err);
}

// TODOS
// - remove craco, meow, etc
// - can components change their name? how to prevent
//   that from happening? or if it does happen, how does one update
//   their db/wherever they store this?
// - make sure react/react-dom have the same versions across the repo
// fix stdio coloring
// the components map has to be 'virtual'
// verify IDE integration
// how do you write tests for this???
// sparse checkout helpers
// auto assign reviewers???
// SOON
// - show an actual example working, with an app registry and everything
// - try to use module federation? will need to fork react-scripts and/or webpack

// unanswered questions
//   - global store/data flow?
//   - drilldown pattern
//   - filters
//   etc etc

// desktop / RN / custom renderers
// er, angular?
