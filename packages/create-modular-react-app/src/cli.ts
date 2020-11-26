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
    execa.sync('yarnpkg', ['-v']);
    return true;
  } catch (err) {
    return false;
  }
}

export default function createModularApp(argv: {
  _: readonly string[];
  repo?: boolean;
  'prefer-offline'?: boolean;
}): void {
  const preferOfflineArg = argv['prefer-offline'] ? ['--prefer-offline'] : [];
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

  const newModularRoot =
    name[0] === '/' ? /* absolute */ name : path.join(process.cwd(), name);
  const packagesPath = path.join(newModularRoot, 'packages');
  const modularGlobalConfigsPath = path.join(newModularRoot, 'modular');
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
    workspaces: ['packages/*'],
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
      'eslint-config-modular-app',
      'typescript@~4.1.2',
      ...preferOfflineArg,
    ],
    { cwd: newModularRoot },
  );

  fs.mkdirpSync(packagesPath);
  fs.copySync(
    path.join(templatePath, 'packages/README.md'),
    path.join(packagesPath, 'README.md'),
  );

  fs.mkdirpSync(modularGlobalConfigsPath);
  fs.copySync(
    path.join(templatePath, 'modular/setupTests.ts'),
    path.join(modularGlobalConfigsPath, 'setupTests.ts'),
  );

  fs.copySync(
    path.join(templatePath, 'gitignore'),
    path.join(newModularRoot, '.gitignore'),
  );

  fs.copySync(
    path.join(templatePath, 'gitignore'),
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

  execSync(
    'yarnpkg',
    ['modular', 'add', 'app', '--unstable-type=app', ...preferOfflineArg],
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
}
