import execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

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

export default function createModularApp(argv: {
  name: string;
  repo?: boolean;
  'prefer-offline'?: boolean;
}): Promise<void> {
  const preferOfflineArg = argv['prefer-offline'] ? ['--prefer-offline'] : [];
  if (isYarnInstalled() === false) {
    console.error(
      'Please install `yarn` before attempting to run `create-modular-react-app`.',
    );
    process.exit(1);
  }

  const name = argv.name;
  const newModularRoot =
    name[0] === '/' || name.includes(':\\')
      ? /* absolute */ name
      : path.join(process.cwd(), name);
  const projectPackageJsonPath = path.join(newModularRoot, 'package.json');
  const templatePath = path.join(__dirname, '..', 'template');

  // Create a new CRA app, modify config for workspaces
  fs.mkdirpSync(newModularRoot);

  // CRA bails from creating a Git repository if it's run within one.
  //
  // See: https://github.com/facebook/create-react-app/blob/47e9e2c7a07bfe60b52011cf71de5ca33bdeb6e3/packages/react-scripts/scripts/init.js#L48-L50
  if (argv.repo !== false) {
    execSync('git', ['init'], {
      cwd: newModularRoot,
    });
  }

  execSync('yarnpkg', ['init', '-y'], {
    cwd: newModularRoot,
  });

  fs.writeJsonSync(projectPackageJsonPath, {
    ...fs.readJsonSync(projectPackageJsonPath),
    private: true,
    workspaces: ['packages/**'],
    modular: {
      type: 'root',
    },
    scripts: {
      start: 'modular start app',
      build: 'modular build app',
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
    [
      'add',
      '-W',
      '--silent',
      '@testing-library/dom',
      '@testing-library/jest-dom',
      '@testing-library/react',
      '@testing-library/user-event',
      '@types/node',
      '@types/jest',
      '@types/react',
      '@types/react-dom',
      'react',
      'react-dom',
      'prettier',
      'modular-scripts',
      'eslint',
      'eslint-config-modular-app',
      'typescript@^4.1.2',
      ...preferOfflineArg,
    ],
    { cwd: newModularRoot },
  );

  fs.copySync(templatePath, newModularRoot);

  // rename gitgnore to .gitgnore so it actually works
  fs.moveSync(
    path.join(newModularRoot, 'gitignore'),
    path.join(newModularRoot, '.gitignore'),
  );

  execSync(
    'yarnpkg',
    [
      'modular',
      'add',
      'app',
      '--unstable-type',
      'app',
      '--unstable-name',
      'app',
      '--silent',
      ...preferOfflineArg,
    ],
    {
      cwd: newModularRoot,
    },
  );

  if (argv.repo !== false) {
    execSync('git', ['add', '.'], {
      cwd: newModularRoot,
    });

    // don't try to commit in CI
    if (!process.env.CI) {
      execSync('git', ['commit', '-m', 'Initial commit'], {
        cwd: newModularRoot,
      });
    }
  }

  return Promise.resolve();
}
