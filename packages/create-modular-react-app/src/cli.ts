#!/usr/bin/env node

import execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { argv } from 'yargs';

import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';

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
    execa.sync('yarnpkg', ['-v']);
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

  const [name] = argv._;
  if (!name) {
    console.error(
      'Please pass a name into `yarn create modular-react-app [name]`.',
    );
    process.exit(1);
  }

  const defaultTemplate = 'cra-template-modular-typescript';
  // const template = (argv.template ?? defaultTemplate) as string;
  // https://github.com/jpmorganchase/modular/issues/37
  // Holding off on using custom templates until we have
  // actual usecases.
  const template = defaultTemplate;

  const newModularRoot = path.join(process.cwd(), name);

  const packagesPath = path.join(newModularRoot, 'packages');
  const appPath = path.join(packagesPath, 'app');
  const sharedPackagePath = path.join(packagesPath, 'shared');

  const projectPackageJsonPath = path.join(newModularRoot, 'package.json');
  const appPackageJsonPath = path.join(appPath, 'package.json');

  const templatePath = path.join(__dirname, '..', 'template');

  // Create a new CRA app, modify config for workspaces
  fs.mkdirpSync(newModularRoot);

  execSync('yarnpkg', ['init', '-y'], {
    cwd: newModularRoot,
  });

  fs.writeJsonSync(projectPackageJsonPath, {
    ...fs.readJsonSync(projectPackageJsonPath),
    private: true,
    workspaces: ['packages/*'],
    modular: {
      type: 'root',
    },
    scripts: {
      start: 'modular start packages/app',
      build: 'modular build packages/app',
      test: 'modular test',
      lint: 'eslint . --ext .js,.ts,.tsx',
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
    'yarnpkg',
    ['add', '-W', 'prettier', 'modular-scripts', 'eslint-config-modular-app'],
    { cwd: newModularRoot },
  );

  fs.mkdirpSync(packagesPath);
  fs.copySync(
    path.join(templatePath, 'packages/README.md'),
    path.join(packagesPath, 'README.md'),
  );

  fs.mkdirpSync(sharedPackagePath);
  fs.copySync(
    path.join(templatePath, 'shared/README.md'),
    path.join(sharedPackagePath, 'README.md'),
  );

  execSync('yarnpkg', ['init', '-yp'], {
    cwd: sharedPackagePath,
  });

  execSync('yarnpkg', ['create', 'react-app', 'app', '--template', template], {
    cwd: packagesPath,
  });
  fs.removeSync(path.join(appPath, '.gitignore'));
  fs.removeSync(path.join(appPath, '.git'));
  fs.removeSync(path.join(appPath, 'yarn.lock'));
  fs.removeSync(path.join(appPath, 'README.md'));

  fs.copySync(
    path.join(templatePath, 'gitignore'),
    path.join(newModularRoot, '.gitignore'),
  );
  fs.copySync(
    path.join(newModularRoot, '.gitignore'),
    path.join(newModularRoot, '.eslintignore'),
  );
  fs.copySync(
    path.join(templatePath, 'tsconfig.json'),
    path.join(newModularRoot, 'tsconfig.json'),
  );
  fs.copySync(
    path.join(templatePath, 'README.md'),
    path.join(newModularRoot, 'README.md'),
  );

  const appPackageJson = fs.readJsonSync(
    appPackageJsonPath,
  ) as JSONSchemaForNPMPackageJsonFiles;
  delete appPackageJson['scripts'];
  delete appPackageJson['eslintConfig'];
  appPackageJson.private = true;
  appPackageJson.modular = { type: 'app' };
  fs.writeJsonSync(appPackageJsonPath, appPackageJson, { spaces: 2 });

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
// make sure _any_ dependency has the same versions across the repo
// fix stdio coloring
// verify IDE integration
// sparse checkout helpers
// auto assign reviewers???
// SOON
// unanswered questions
//   - global store/data flow?
//   - drilldown pattern
//   - filters
//   etc etc

// desktop / RN / custom renderers
// er, angular?
