import path from 'path';
import fs from 'fs-extra';

/**
 * Adds a package to the current modular repo
 * Can't be made compatible with path parameter as addPackage has a check that uses path.relative()
 * that will fail as it uses the CWD
 * Use with setupMocks/Mocked getModularRoot to ensure that it adds the package in the correct test context
 * @param name Name of package to add
 * @param type Modular Type of package being added (template)
 */
export async function addPackageForTests(
  name: string,
  type: string,
): Promise<void> {
  const { default: addPackage } = await import('../addPackage');
  await addPackage({
    name,
    type,
  });
}

interface TestOptionsForTests {
  packages?: string[];
  regex?: string[];
  changed?: boolean;
}

/**
 * Runs tests based on the provided parameters & returns spied process.exit and any errors thrown
 * Mocking process.exit ensures the test function can't call process.exit and end the process for all tests
 * Use with setupMocks/Mocked getModularRoot to ensure that it adds the package in the correct test context
 */
export async function runTestForTests(options: TestOptionsForTests) {
  const mockExit = mockProcessExit();
  const { default: test } = await import('./index');
  // Mock process.exit so that it doesn't do anything during these tests
  let err;
  try {
    await test(
      {
        env: 'jsdom',
        regex: options.regex,
        changed: options.changed,
      },
      options.packages,
    );
  } catch (e) {
    err = (e as Error).message;
  }
  // Tests can fail in two ways: error, and process.exit - we have to cover both
  return { mockExit, err };
}

interface SelectOptionsForTests {
  changed?: boolean;
  compareBranch?: string;
  ancestors?: boolean;
  descendants?: boolean;
  buildable?: boolean;
  selectedPackages?: string[];
}

/**
 * Runs select command with provided options & returns log output
 * Use with setupMocks/Mocked getModularRoot to ensure that it adds the package in the correct test context
 */
export async function runSelectForTests({
  changed = false,
  compareBranch = undefined,
  ancestors = false,
  descendants = false,
  buildable = false,
  selectedPackages = [],
}: SelectOptionsForTests) {
  const stdoutArray: string[] = [];
  const stderrArray: string[] = [];
  mockProcessLogs(stdoutArray, stderrArray);
  const { default: select } = await import('../select');

  await select({
    changed,
    compareBranch,
    ancestors,
    descendants,
    buildable,
    selectedPackages,
  });

  return { stdout: stdoutArray.join('\n'), stderr: stderrArray.join('\n') };
}

interface LintOptionsForTests {
  all?: boolean;
  fix?: boolean;
  staged?: boolean;
  packages?: string[];
  ancestors?: boolean;
  descendants?: boolean;
  changed?: boolean;
  compareBranch?: string;
}

/**
 * Runs lint command with provided options & returns spied process.exit, log output, and any errors thrown
 * Use with setupMocks/Mocked getModularRoot to ensure that it adds the package in the correct test context
 */
export async function runLintForTests(
  {
    all = false,
    fix = false,
    staged = false,
    packages = [],
    ancestors = false,
    descendants = false,
    changed = false,
    compareBranch,
  }: LintOptionsForTests,
  regexes: string[] = [],
) {
  const stdoutArray: string[] = [];
  const stderrArray: string[] = [];
  mockProcessLogs(stdoutArray, stderrArray);
  const { default: lint } = await import('../lint');
  await lint(
    {
      all,
      fix,
      staged,
      packages,
      ancestors,
      descendants,
      changed,
      compareBranch,
    },
    regexes,
  );

  return {
    stderrArray,
    stdoutArray,
  };
}

/**
 * Build a specified package
 * Use with setupMocks/Mocked getModularRoot to ensure that it looks for the package in the correct test context
 * @param targetPackage Target package to build
 * @param config Optional array of configuration options and their values to affect build
 */
export async function buildPackageForTests(
  targetPackage: string,
  config?: string[],
) {
  if (config) await writeConfig(targetPackage, config);
  const { default: build } = await import('../build-scripts/index');
  await build({
    packagePaths: [targetPackage],
    preserveModules: false,
    private: false,
    ancestors: false,
    descendants: false,
    changed: false,
    dangerouslyIgnoreCircularDependencies: false,
  });
  if (config) await deleteConfig(targetPackage);
}

/**
 * Write a modular configuration file in the temporary
 * modular repo to configure modular command behaviour
 * Use with setupMocks/Mocked getModularRoot to ensure that it looks for the package in the correct test context
 * @param targetPackage name of package being configured
 * @param config Array of configuration options and their value
 */
async function writeConfig(targetPackage: string, config: string[]) {
  const { default: getWorkspaceLocation } = await import(
    '../utils/getLocation'
  );
  const targetPath = await getWorkspaceLocation(targetPackage);
  await fs.writeFile(
    path.join(targetPath, '.modular.js'),
    `module.exports = {\n
        ${config.join(',\n')},\n};`,
  );
}

/**
 * Opposite of write config - doesn't actually delete, just overwrites with an empty config
 * Use with setupMocks/Mocked getModularRoot to ensure that it looks for the package in the correct test context
 * @param targetPackage name of package being configured
 */
async function deleteConfig(targetPackage: string) {
  const { default: getWorkspaceLocation } = await import(
    '../utils/getLocation'
  );
  const targetPath = await getWorkspaceLocation(targetPackage);
  // Can't actually delete due to permission issues so just overwrite with empty
  await fs.writeFile(
    path.join(targetPath, '.modular.js'),
    `module.exports = {};`,
  );
}

/**
 * Set up mocked ModularRoot and skip preflight checks so that dynamically imported code can run
 * on the temporary modular repo provided, rather than on the current modular root
 * @param modularRoot Path to temporary modular repo to mock getModularRoot to
 */
export function setupMocks(modularRoot: string) {
  // Resets mocks and modules so that modules use updated mocked modularRoot
  jest.resetAllMocks();
  jest.resetModules();
  // Mock the modular root per temporary modular repo
  jest.doMock('../utils/getModularRoot', () => {
    return {
      __esModule: true,
      default: () => modularRoot,
    };
  });
  // Skip preflight in tests (faster, avoids the need to mock getModularRoot statically)
  jest.doMock(
    '../utils/actionPreflightCheck',
    () => mockPreflightImplementation,
  );
}

/**
 * Mocks process.exit so that it doesn't happen during tests
 * @returns jest.SpyInstance which you can use to test with expect(mockExit).toHaveBeenCalled()
 */
export function mockProcessExit() {
  return jest.spyOn(process, 'exit').mockImplementation(() => {
    return undefined as never;
  });
}

/**
 * Mocks process.stdout so that it doesn't happen during tests
 * @returns jest.SpyInstance which you can use to test with expect(mockExit).toHaveBeenCalledWith('Log that you're expecting')
 */
export function mockProcessLogs(stdout: string[], stderr: string[]) {
  jest.spyOn(process.stdout, 'write').mockImplementation((text) => {
    stdout.push(String(text));
    return undefined as never;
  });
  jest.spyOn(process.stderr, 'write').mockImplementation((text) => {
    stderr.push(String(text));
    return undefined as never;
  });
  jest.spyOn(console, 'log').mockImplementation((text) => {
    stdout.push(String(text));
    return undefined as never;
  });
}

export const mockPreflightImplementation = {
  __esModule: true,
  default: (fn: (...args: unknown[]) => Promise<void>) => {
    return fn;
  },
};
