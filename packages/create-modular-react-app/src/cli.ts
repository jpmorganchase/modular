#!/usr/bin/env node

import execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
// See https://github.com/facebook/create-react-app/blob/f36d61a/packages/react-scripts/bin/react-scripts.js#L11-L16
process.on('unhandledRejection', (err) => {
  throw err;
});

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
    execa.sync('yarn', ['-v']);
    return true;
  } catch (err) {
    return false;
  }
}

function createModularApp() {
  if (isYarnInstalled() === false) {
    console.error(
      'Please install `yarn` before attempting to run `create-modular-react-app`.',
    );
    process.exit(1);
  }

  const index = process.argv.findIndex((arg) =>
    arg.endsWith('modular-react-app'),
  );
  const [name] = index !== -1 ? process.argv.slice(index + 1) : [undefined];
  if (!name) {
    console.error(
      'Please pass a name into `yarn create modular-react-app [name]`.',
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
      lint: 'eslint .',
      prettier: 'prettier --write .',
    },
    eslintConfig: {
      extends: 'modular-app',
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
    [
      'add',
      '-W',
      '--dev',
      'prettier',
      'modular-scripts',
      'eslint-config-modular-app',
    ],
    { cwd: newModularRoot },
  );

  fs.mkdirpSync(widgetsPath);
  fs.copySync(
    path.join(templatePath, 'widgets/README.md'),
    path.join(widgetsPath, 'README.md'),
  );

  execSync('yarn', ['create', 'react-app', 'app'], {
    cwd: newModularRoot,
  });
  fs.removeSync(path.join(appPath, '.gitignore'));
  fs.removeSync(path.join(appPath, '.git'));
  fs.removeSync(path.join(appPath, 'yarn.lock'));

  fs.copySync(
    path.join(templatePath, 'gitignore'),
    path.join(newModularRoot, '.gitignore'),
  );

  // TODO: Rather than manually copying files across and installing dependencies this should use a `--template`
  // that includes `store.js` and `widgets.js`, doesn't contain a service worker and installs the correct dependencies.
  // See: https://github.com/facebook/create-react-app/tree/master/packages/cra-template
  fs.copySync(
    path.join(templatePath, 'app/store.js'),
    path.join(appPath, 'src/store.js'),
  );
  fs.copySync(
    path.join(templatePath, 'app/widgets.js'),
    path.join(appPath, 'src/widgets.js'),
  );
  execSync('yarn', ['add', 'codegen.macro'], { cwd: appPath });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const appPackageJson = fs.readJsonSync(appPackageJsonPath);
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  delete appPackageJson['scripts'];
  delete appPackageJson['eslintConfig'];
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  fs.writeJsonSync(appPackageJsonPath, appPackageJson);

  execSync('yarn', ['prettier'], {
    cwd: newModularRoot,
  });
  execSync('git', ['init'], {
    cwd: newModularRoot,
  });

  execSync('git', ['add', '.'], {
    cwd: newModularRoot,
  });
  execSync('git', ['commit', '-m', 'Initial commit'], { cwd: newModularRoot });
}

try {
  void createModularApp();
} catch (err) {
  console.error(err);
}

// TODOS
// - make sure react/react-dom have the same versions across the repo
// fix stdio coloring
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
