import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import * as semver from 'semver';

function exec(file: string, args: string[], cwd: string) {
  console.log(chalk.grey(`$ ${file} ${args.join(' ')}`));
  try {
    return execa(file, args, {
      stdin: process.stdin,
      stderr: process.stderr,
      stdout: process.stdout,
      cwd,
    });
  } catch (e) {
    console.error(chalk.red(`$ FAILED ${file} ${args.join(' ')}`));
    throw e;
  }
}

function isYarnInstalled(): boolean {
  try {
    execa.sync('yarnpkg', ['-v']);
    return true;
  } catch (err) {
    return false;
  }
}

export default async function createModularApp(argv: {
  name: string;
  repo?: boolean;
  preferOffline?: boolean;
  verbose?: boolean;
}): Promise<void> {
  const { engines } = fs.readJSONSync(
    require.resolve('create-modular-react-app/package.json'),
  ) as PackageJson;

  const nodeEngines = engines?.node as string;
  if (!semver.satisfies(process.version, nodeEngines)) {
    throw new Error(
      `${process.version} does not satisfy modular engine constraint ${nodeEngines}`,
    );
  }

  const preferOfflineArg = argv.preferOffline ? ['--prefer-offline'] : [];
  const verboseArgs = argv.verbose ? ['--verbose'] : [];

  if (isYarnInstalled() === false) {
    console.error(
      'Please install `yarn` before attempting to run `create-modular-react-app`.',
    );
    throw new Error(`Yarn was not installed`);
  }

  const newModularRoot = path.isAbsolute(argv.name)
    ? argv.name
    : path.join(process.cwd(), argv.name);
  const projectPackageJsonPath = path.join(newModularRoot, 'package.json');
  const templatePath = path.join(__dirname, '..', 'template');

  // Create a new CRA app, modify config for workspaces
  fs.mkdirpSync(newModularRoot);

  // CRA bails from creating a Git repository if it's run within one.
  //
  // See: https://github.com/facebook/create-react-app/blob/47e9e2c7a07bfe60b52011cf71de5ca33bdeb6e3/packages/react-scripts/scripts/init.js#L48-L50
  if (argv.repo !== false) {
    await exec('git', ['init'], newModularRoot);
  }

  await exec('yarnpkg', ['init', '-y'], newModularRoot);

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

  await exec(
    'yarnpkg',
    [
      'add',
      '-W',
      ...verboseArgs,
      ...preferOfflineArg,
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
      'eslint-config-modular-app',
      'typescript@^4.1.2',
    ],
    newModularRoot,
  );

  await fs.copy(templatePath, newModularRoot);

  // rename gitgnore to .gitgnore so it actually works
  await fs.move(
    path.join(newModularRoot, 'gitignore'),
    path.join(newModularRoot, '.gitignore'),
  );

  await fs.move(
    path.join(newModularRoot, 'yarnrc'),
    path.join(newModularRoot, '.yarnrc'),
  );

  await exec(
    'yarnpkg',
    [
      'modular',
      'add',
      'app',
      '--unstable-type',
      'app',
      '--unstable-name',
      'app',
      ...verboseArgs,
    ],
    newModularRoot,
  );

  if (argv.repo !== false) {
    await exec('git', ['add', '.'], newModularRoot);

    // don't try to commit in CI
    if (!process.env.CI) {
      await exec('git', ['commit', '-m', 'Initial commit'], newModularRoot);
    }
  }

  return Promise.resolve();
}
