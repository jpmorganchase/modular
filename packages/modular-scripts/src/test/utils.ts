import path from 'path';
import { promisify } from 'util';
import { mkdirSync } from 'fs';
import _rimraf from 'rimraf';
import execa from 'execa';
import fs, { writeJSONSync } from 'fs-extra';
import * as tmp from 'tmp';
import findUp from 'find-up';
import type { ModularPackageJson } from '@modular-scripts/modular-types';
import type { Config } from '@jest/types';

const rimraf = promisify(_rimraf);

/**
 * This is a duplicate copy of `getModularRoot`.
 * It exists as a standalone test util so that we can mock the real `getMockRoot` in tests.
 *
 * A copy of the real implementation (i.e. one that returns the modular root of modular itself) is
 * still needed in test code for things like test setup (and the other utilities in here).
 */
export function getRealModularRootInTest(): string {
  function isModularRoot(packageJsonPath: string) {
    const packageJson = fs.readJSONSync(packageJsonPath, {
      encoding: 'utf8',
    }) as { modular?: Record<string, unknown> };
    return packageJson?.modular?.type === 'root';
  }

  function findModularRoot(): string | undefined {
    try {
      const modularRoot = findUp.sync(
        (directory: string) => {
          const packageJsonPath = path.join(directory, 'package.json');
          if (
            findUp.sync.exists(packageJsonPath) &&
            isModularRoot(packageJsonPath)
          ) {
            return packageJsonPath;
          }
          return;
        },
        { type: 'file', allowSymlinks: false },
      );

      return modularRoot
        ? path.normalize(path.dirname(modularRoot))
        : undefined;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  const modularRoot = findModularRoot();

  if (modularRoot === undefined) {
    throw new Error('Could not find modular root.');
  }

  return modularRoot;
}

const modularRoot = getRealModularRootInTest();

export async function cleanup(packageNames: Array<string>): Promise<void> {
  const packagesPath = path.join(modularRoot, 'packages');
  const distPath = path.join(modularRoot, 'dist');

  for (const packageName of packageNames) {
    await rimraf(path.join(packagesPath, packageName));
    await rimraf(path.join(distPath, packageName));
  }

  // run yarn so yarn.lock gets reset
  await execa('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

export async function addFixturePackage(
  name: string,
  options: { copy: boolean } = { copy: true },
): Promise<void> {
  const packageSrcDir = path.join(modularRoot, 'packages', name, 'src');
  await runYarnModular(modularRoot, `add ${name} --unstable-type package`, {
    stdio: 'inherit',
  });
  await fs.emptyDir(packageSrcDir);

  if (options.copy) {
    await fs.copy(
      path.join(__dirname, '..', '__tests__', '__fixtures__', 'packages', name),
      packageSrcDir,
    );
  }
}

/**
 * Creates a temporary Modular repo test environment with a default package.json and an empty packages workspace.
 * Modular node_modules is symlinked in the parent directory to provide all required dependencies without installing them.
 *
 * Use to create a clean context to run tests in where you can call `yarn modular` commands
 * without having to install dependencies nor tests within the main Modular repo.
 * @returns Path to temporary directory
 */
export function createModularTestContext(): string {
  // Modular node_modules are copied in the parent folder
  const tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
  fs.symlinkSync(
    path.join(modularRoot, 'node_modules'),
    path.join(tempDir, 'node_modules'),
  );

  // Actual mock modular repo is nested in the temp directory so that it can have its own clean node_modules
  const tempModularRepo = path.join(tempDir, 'temp_repo');
  mkdirSync(tempModularRepo);

  // Create mock modular package.json
  const packageJson: Partial<ModularPackageJson> = {
    name: 'temp',
    license: 'MIT',
    private: true,
    modular: {
      type: 'root',
    },
    workspaces: ['packages/**', 'templates/**'],
    scripts: {
      modular: `ts-node ${modularRoot}/packages/modular-scripts/src/cli.ts`,
    },
    browserslist: {
      production: ['>0.2%', 'not dead', 'not op_mini all'],
      development: [
        'last 1 chrome version',
        'last 1 firefox version',
        'last 1 safari version',
      ],
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    },
  };

  fs.writeJSONSync(path.join(tempModularRepo, 'package.json'), packageJson, {
    spaces: 2,
  });
  fs.writeJSONSync(path.join(tempModularRepo, 'tsconfig.json'), {
    extends: 'modular-scripts/tsconfig.json',
    include: ['modular', 'packages/**/src'],
  });
  fs.copySync(
    path.join(modularRoot, 'modular'),
    path.join(tempModularRepo, 'modular'),
  );
  return tempModularRepo;
}

/**
 * Mocks the installation of a template in the provided modular repo to avoid running `yarn` or installing it from a registry.
 *
 * Copies the template into a Templates workspace and symlinks them in node_modules so that it can be picked up by modular add.
 * @param templatePath Path to directory containing templates
 * @param modularRepo Modular repo in which to install them
 */
export function mockInstallTemplate(
  templatePath: string,
  modularRepo: string,
): void {
  const tempTemplatesPath = path.join(modularRepo, 'templates');
  const templateName = path.basename(templatePath);

  // Copy the template into the temporary repo
  fs.copySync(templatePath, path.join(tempTemplatesPath, templateName));

  // Symlink the templates into node_modules
  const tempRepoNodeModules = path.join(modularRepo, 'node_modules');
  if (!fs.existsSync(tempRepoNodeModules)) fs.mkdirSync(tempRepoNodeModules);

  fs.symlinkSync(
    path.join(tempTemplatesPath, templateName),
    path.join(tempRepoNodeModules, templateName),
  );
}

/**
 * Generates the Jest --config flag contents to pass when calling Jest based on config JSON provided
 *
 * - On Mac, it will provide a stringyfied version of the config JSON provided
 *
 * - On Windows, it will write the config JSON to a file in a temp directory and provde the path to pass
 */
export function generateJestConfig(jestConfig: Config.InitialOptions): string {
  if (process.platform === 'win32') {
    const tempConfigPath = path.join(
      tmp.dirSync().name,
      'temp-jest-config.json',
    );
    writeJSONSync(tempConfigPath, jestConfig);
    return `${tempConfigPath}`;
  } else {
    return `${JSON.stringify(jestConfig)}`;
  }
}

/**
 * Run the main repo's modular cli with the specified arguments, skipping modular checks by default to improve performance
 * Should be used by most tests - logs from the process are inherited by default
 *
 * @param cwd Where to run modular
 * @param args String of arguments to pass to modular
 * @param opts Options to pass to execa
 * @param stdio Override 'inherit' defailt stdio option
 * @param skipChecks Override 'true' default to skipping startup and preflight checks
 */
export function runModularForTests(
  cwd: string,
  args: string,
  opts: Record<string, unknown> = {},
  stdio: 'inherit' | 'pipe' | 'ignore' = 'inherit',
  skipChecks: 'true' | 'false' = 'true',
): execa.ExecaSyncReturnValue<string> {
  return execa.sync(
    path.join(modularRoot, '/node_modules/.bin/ts-node'),
    [
      path.join(modularRoot, '/packages/modular-scripts/src/cli.ts'),
      ...args.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g),
    ],
    {
      cwd,
      env: {
        ...process.env,
        SKIP_MODULAR_STARTUP_CHECK: skipChecks,
        SKIP_PREFLIGHT_CHECK: skipChecks,
        CI: 'true',
      },
      stdio,
      cleanup: true,
      all: true,
      ...opts,
    },
  );
}

/**
 * Wrapper of runModularForTests that runs checks to make it safe & pipes output
 * Skip checks is false by default when we pipe output as unsafe output includes warnings that Modular repository might be invalid
 */
export function runModularPipeLogs(
  cwd: string,
  args: string,
  skipChecks: 'true' | 'false' = 'false',
  opts: Record<string, unknown> = {},
) {
  return runModularForTests(cwd, args, opts, 'pipe', skipChecks);
}

/**
 * Async alternative to runModularForTests
 */
export async function runModularForTestsAsync(
  cwd: string,
  args: string,
  opts: Record<string, unknown> = {},
  stdio: 'inherit' | 'pipe' | 'ignore' = 'inherit',
  skipChecks: 'true' | 'false' = 'true',
) {
  return execa(
    path.join(modularRoot, '/node_modules/.bin/ts-node'),
    [
      path.join(modularRoot, '/packages/modular-scripts/src/cli.ts'),
      ...args.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g),
    ],
    {
      cwd,
      env: {
        ...process.env,
        SKIP_MODULAR_STARTUP_CHECK: skipChecks,
        SKIP_PREFLIGHT_CHECK: skipChecks,
        CI: 'true',
      },
      stdio,
      all: true,
      cleanup: true,
      ...opts,
    },
  );
}

/**
 * Runs `yarnpkg modular` in given directory with minimal configuration
 */
export async function runYarnModular(
  cwd: string,
  args: string,
  opts: Record<string, unknown> = {},
) {
  return execa(
    'yarnpkg',
    ['modular', ...args.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g)],
    {
      cwd,
      all: true,
      cleanup: true,
      ...opts,
    },
  );
}
