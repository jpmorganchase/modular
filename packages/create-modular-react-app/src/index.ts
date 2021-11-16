import type { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import { Transform } from 'stream';
import execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import * as semver from 'semver';

function exec(
  file: string,
  args: string[],
  cwd: string,
  options: execa.Options = {},
) {
  console.log(chalk.grey(`$ ${file} ${args.join(' ')}`));

  const defaultOptions: execa.Options<string> = {
    stdin: 'inherit',
    stderr: 'inherit',
    stdout: 'inherit',
    cwd,
    cleanup: true,
    reject: true,
  };
  // Merge the optional custom options. Useful to transform the output streams.
  const executionOptions = { ...defaultOptions, ...options };
  const subprocess = execa(file, args, executionOptions);

  subprocess.catch((e) => {
    console.error(chalk.red(`$ FAILED ${file} ${args.join(' ')}`));
    throw new Error((e as Error).message);
  });

  return subprocess;
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
  empty?: boolean;
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
  if (argv.repo) {
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
    browserslist: {
      production: ['>0.2%', 'not dead', 'not op_mini all'],
      development: [
        'last 1 chrome version',
        'last 1 firefox version',
        'last 1 safari version',
      ],
    },
    prettier: {
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 80,
      proseWrap: 'always',
    },
  });

  const subprocess = exec(
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
    // We can't pass a stream here if it's not backed by a fd. We need to set it to 'pipe', then pipe it from the ChildProcess to our transformer
    { stderr: argv.verbose ? 'inherit' : 'pipe' },
  );

  if (!argv.verbose) {
    // There is no way of suppressing warnings in Yarn Classic - https://github.com/yarnpkg/yarn/issues/6672
    // Let's just filter out the stderr lines we don't want. We have color codes, so we can't really test for start of string (^)
    subprocess.stderr
      ?.pipe(new LineFilterOutStream(/.*warning.*/))
      .pipe(process.stderr);
  }

  await subprocess;

  await fs.copy(templatePath, newModularRoot, { overwrite: true });

  // rename gitgnore to .gitgnore so it actually works
  await fs.move(
    path.join(newModularRoot, 'gitignore'),
    path.join(newModularRoot, '.gitignore'),
    {
      overwrite: true,
    },
  );

  await fs.move(
    path.join(newModularRoot, 'yarnrc'),
    path.join(newModularRoot, '.yarnrc'),
    {
      overwrite: true,
    },
  );

  if (!argv.empty) {
    await exec(
      path.join(newModularRoot, 'node_modules', '.bin', 'modular'),
      [
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
  }

  if (argv.repo) {
    await exec('git', ['add', '.'], newModularRoot);

    // don't try to commit in CI
    if (!process.env.CI) {
      await exec('git', ['commit', '-m', 'Initial commit'], newModularRoot);
    }
  }

  return Promise.resolve();
}

class LineFilterOutStream extends Transform {
  // A stream transform to filter out lines that pass the regexp test
  buffer = '';
  pattern: RegExp;

  constructor(pattern: RegExp) {
    super();
    this.pattern = pattern;
  }

  _transform(
    chunk: unknown,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: string) => void,
  ) {
    const data = String(chunk);
    const lines = data.split('\n');

    // Handle last line which is probably incomplete
    lines[0] = this.buffer + lines[0];
    this.buffer = lines.pop() ?? '';

    const output = lines.reduce((acc, line) => {
      if (!this.pattern.test(line)) {
        acc += `${line}\n`;
      }
      return acc;
    }, '');

    this.push(output);
    callback();
  }
}
