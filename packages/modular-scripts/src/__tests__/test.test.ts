import execa, { ExecaError } from 'execa';
import path from 'path';
import fs from 'fs-extra';
import tmp from 'tmp';
import getModularRoot from '../utils/getModularRoot';

function setupTests(fixturesFolder: string) {
  const files = fs.readdirSync(path.join(fixturesFolder));
  files.forEach((file) => {
    fs.writeFileSync(
      path.join(fixturesFolder, file),
      fs
        .readFileSync(path.join(fixturesFolder, file), 'utf-8')
        .replace('describe.skip', 'describe'),
    );
  });
}

function clearTests(fixturesFolder: string) {
  const files = fs.readdirSync(path.join(fixturesFolder));
  files.forEach((file) => {
    fs.writeFileSync(
      path.join(fixturesFolder, file),
      fs
        .readFileSync(path.join(fixturesFolder, file), 'utf-8')
        .replace('describe', 'describe.skip'),
    );
  });
}

describe('Modular test command', () => {
  describe('test command succeeds on valid test and fails on invalid tests', () => {
    const fixturesFolder = path.join(__dirname, '__fixtures__', 'test');

    beforeEach(() => {
      setupTests(fixturesFolder);
    });

    afterEach(() => {
      clearTests(fixturesFolder);
    });

    describe('when the tests fail', () => {
      it('should exit with an error', async () => {
        let errorNumber = 0;
        try {
          await execa(
            'yarnpkg',
            ['modular', 'test', 'test/InvalidTest.test.ts'],
            {
              all: true,
              cleanup: true,
            },
          );
        } catch (error) {
          errorNumber = (error as ExecaError).exitCode;
        }
        expect(errorNumber).toEqual(1);
      });
    });

    describe('when the tests pass', () => {
      it('should exit with no error', async () => {
        let errorNumber = 0;
        try {
          await execa(
            'yarnpkg',
            ['modular', 'test', 'test/ValidTest.test.ts'],
            {
              all: true,
              cleanup: true,
            },
          );
        } catch (error) {
          errorNumber = (error as ExecaError).exitCode;
        }
        expect(errorNumber).toEqual(0);
      });
    });
  });

  describe('test command can successfully do selective tests based on the state of the repository', () => {
    const fixturesFolder = path.join(
      __dirname,
      Array.from({ length: 4 }).reduce<string>(
        (acc) => `${acc}..${path.sep}`,
        '',
      ),
      '__fixtures__',
      'ghost-testing',
    );

    const currentModularFolder = getModularRoot();
    let randomOutputFolder: string;

    beforeEach(() => {
      // Create random dir
      randomOutputFolder = tmp.dirSync({ unsafeCleanup: true }).name;
      fs.copySync(fixturesFolder, randomOutputFolder);

      // Create git repo & commit
      if (process.env.GIT_AUTHOR_NAME && process.env.GIT_AUTHOR_EMAIL) {
        execa.sync('git', [
          'config',
          '--global',
          'user.email',
          `"${process.env.GIT_AUTHOR_EMAIL}"`,
        ]);
        execa.sync('git', [
          'config',
          '--global',
          'user.name',
          `"${process.env.GIT_AUTHOR_NAME}"`,
        ]);
      }
      execa.sync('git', ['init'], {
        cwd: randomOutputFolder,
      });
      execa.sync('yarn', {
        cwd: randomOutputFolder,
      });
      execa.sync('git', ['add', '.'], {
        cwd: randomOutputFolder,
      });
      execa.sync('git', ['commit', '-am', '"First commit"'], {
        cwd: randomOutputFolder,
      });
    });

    // These expects run in a single test, serially for performance reasons (the setup time is quite long)
    it('finds no unchanged using --changed / finds changed after modifying some workspaces / finds ancestors using --ancestors', () => {
      const resultUnchanged = runRemoteModularTest(
        currentModularFolder,
        randomOutputFolder,
        ['test', '--changed'],
      );
      expect(resultUnchanged.stdout).toContain('No changed workspaces found');

      fs.appendFileSync(
        path.join(randomOutputFolder, '/packages/b/src/index.ts'),
        "\n// Comment to package b's source",
      );
      fs.appendFileSync(
        path.join(randomOutputFolder, '/packages/c/src/index.ts'),
        "\n// Comment to package c's source",
      );

      const resultChanged = runRemoteModularTest(
        currentModularFolder,
        randomOutputFolder,
        ['test', '--changed'],
      );
      expect(resultChanged.stderr).toContain(
        'packages/c/src/__tests__/utils/c-nested.test.ts',
      );
      expect(resultChanged.stderr).toContain(
        'packages/c/src/__tests__/c.test.ts',
      );
      expect(resultChanged.stderr).toContain(
        'packages/b/src/__tests__/utils/b-nested.test.ts',
      );
      expect(resultChanged.stderr).toContain(
        'packages/b/src/__tests__/b.test.ts',
      );

      const resultChangedWithAncestors = runRemoteModularTest(
        currentModularFolder,
        randomOutputFolder,
        ['test', '--changed', '--ancestors'],
      );
      expect(resultChangedWithAncestors.stderr).toContain(
        'packages/c/src/__tests__/utils/c-nested.test.ts',
      );
      expect(resultChangedWithAncestors.stderr).toContain(
        'packages/c/src/__tests__/c.test.ts',
      );
      expect(resultChangedWithAncestors.stderr).toContain(
        'packages/b/src/__tests__/utils/b-nested.test.ts',
      );
      expect(resultChangedWithAncestors.stderr).toContain(
        'packages/b/src/__tests__/b.test.ts',
      );
      expect(resultChangedWithAncestors.stderr).toContain(
        'packages/a/src/__tests__/utils/a-nested.test.ts',
      );
      expect(resultChangedWithAncestors.stderr).toContain(
        'packages/a/src/__tests__/a.test.ts',
      );
      expect(resultChangedWithAncestors.stderr).toContain(
        'packages/e/src/__tests__/utils/e-nested.test.ts',
      );
      expect(resultChangedWithAncestors.stderr).toContain(
        'packages/e/src/__tests__/e.test.ts',
      );
    });
  });

  describe('test command can successfully do selective tests based on selected packages', () => {
    const fixturesFolder = path.join(
      __dirname,
      Array.from({ length: 4 }).reduce<string>(
        (acc) => `${acc}..${path.sep}`,
        '',
      ),
      '__fixtures__',
      'ghost-testing',
    );

    const currentModularFolder = getModularRoot();
    let randomOutputFolder: string;

    beforeEach(() => {
      // Create random dir
      randomOutputFolder = tmp.dirSync({ unsafeCleanup: true }).name;
      fs.copySync(fixturesFolder, randomOutputFolder);
      execa.sync('yarn', {
        cwd: randomOutputFolder,
      });
    });

    // Run in a single test, serially for performance reasons (the setup time is quite long)
    it('finds --package after specifying a valid workspaces / finds ancestors using --ancestors', () => {
      const resultPackages = runRemoteModularTest(
        currentModularFolder,
        randomOutputFolder,
        ['test', '--package', 'b', '--package', 'c'],
      );
      expect(resultPackages.stderr).toContain(
        'packages/c/src/__tests__/utils/c-nested.test.ts',
      );
      expect(resultPackages.stderr).toContain(
        'packages/c/src/__tests__/c.test.ts',
      );
      expect(resultPackages.stderr).toContain(
        'packages/b/src/__tests__/utils/b-nested.test.ts',
      );
      expect(resultPackages.stderr).toContain(
        'packages/b/src/__tests__/b.test.ts',
      );

      const resultPackagesWithAncestors = runRemoteModularTest(
        currentModularFolder,
        randomOutputFolder,
        ['test', '--ancestors', '--package', 'b', '--package', 'c'],
      );
      expect(resultPackagesWithAncestors.stderr).toContain(
        'packages/c/src/__tests__/utils/c-nested.test.ts',
      );
      expect(resultPackagesWithAncestors.stderr).toContain(
        'packages/c/src/__tests__/c.test.ts',
      );
      expect(resultPackagesWithAncestors.stderr).toContain(
        'packages/b/src/__tests__/utils/b-nested.test.ts',
      );
      expect(resultPackagesWithAncestors.stderr).toContain(
        'packages/b/src/__tests__/b.test.ts',
      );
      expect(resultPackagesWithAncestors.stderr).toContain(
        'packages/a/src/__tests__/utils/a-nested.test.ts',
      );
      expect(resultPackagesWithAncestors.stderr).toContain(
        'packages/a/src/__tests__/a.test.ts',
      );
      expect(resultPackagesWithAncestors.stderr).toContain(
        'packages/e/src/__tests__/utils/e-nested.test.ts',
      );
      expect(resultPackagesWithAncestors.stderr).toContain(
        'packages/e/src/__tests__/e.test.ts',
      );
    });
  });

  describe('test command supports extraneous (non-modular) packages', () => {
    const fixturesFolder = path.join(
      __dirname,
      Array.from({ length: 4 }).reduce<string>(
        (acc) => `${acc}..${path.sep}`,
        '',
      ),
      '__fixtures__',
      'extraneous-packages',
    );

    const currentModularFolder = getModularRoot();
    let randomOutputFolder: string;

    beforeEach(() => {
      // Create random dir
      randomOutputFolder = tmp.dirSync({ unsafeCleanup: true }).name;
      fs.copySync(fixturesFolder, randomOutputFolder);
      execa.sync('yarn', {
        cwd: randomOutputFolder,
      });
    });

    // Run in a single test, serially for performance reasons (the setup time is quite long)
    it("Runs tests on the dependencies of an extraneous test along with ancestors, then fail when the extraneous test fails, succeed when it suceeds and warn when it doesn't exist", () => {
      let errorNumber;
      try {
        runRemoteModularTest(currentModularFolder, randomOutputFolder, [
          'test',
          '--package',
          'failing-extraneous-test',
          '--ancestors',
        ]);
      } catch (error) {
        errorNumber = (error as ExecaError).exitCode;
      }
      expect(errorNumber).toEqual(1);

      const resultPackagesNoTest = runRemoteModularTest(
        currentModularFolder,
        randomOutputFolder,
        ['test', '--package', 'no-extraneous-test', '--ancestors'],
      );

      expect(resultPackagesNoTest.stderr).toContain(
        'PASS test packages/c/src/__tests__/utils/utils.test.ts',
      );

      expect(resultPackagesNoTest.stderr).toContain(
        "Can't run tests for non-modular workspace no-extraneous-test: test script is not defined",
      );

      const resultPackagesSuccessfulTest = runRemoteModularTest(
        currentModularFolder,
        randomOutputFolder,
        ['test', '--package', 'successful-extraneous-test', '--ancestors'],
      );

      expect(resultPackagesSuccessfulTest.stderr).toContain(
        'PASS test packages/b/src/__tests__/utils/utils.test.ts',
      );

      expect(resultPackagesSuccessfulTest.stdout).toContain(
        'this is the test for successful-extraneous-test',
      );
    });
  });

  describe('test command has error states', () => {
    // Run in a single test, serially for performance reasons (the setup time is quite long)
    it('errors when specifying --package with --changed', async () => {
      let errorNumber;
      try {
        await execa(
          'yarnpkg',
          ['modular', 'test', '--changed', '--package', 'modular-scripts'],
          {
            all: true,
            cleanup: true,
          },
        );
      } catch (error) {
        errorNumber = (error as ExecaError).exitCode;
      }
      expect(errorNumber).toEqual(1);
    });

    it('errors when specifying --package with a non-existing workspace', async () => {
      let capturedError;
      try {
        await execa(
          'yarnpkg',
          ['modular', 'test', '--package', 'non-existing'],
          {
            all: true,
            cleanup: true,
          },
        );
      } catch (error) {
        capturedError = error as ExecaError;
      }
      expect(capturedError?.exitCode).toEqual(1);
      expect(capturedError?.stderr).toContain(
        `Package non-existing was specified, but Modular couldn't find it`,
      );
    });

    it('errors when specifying a regex with --packages', async () => {
      let capturedError;
      try {
        await execa(
          'yarnpkg',
          [
            'modular',
            'test',
            'memoize.test.ts',
            '--package',
            'modular-scripts',
          ],
          {
            all: true,
            cleanup: true,
          },
        );
      } catch (error) {
        capturedError = error as ExecaError;
      }
      expect(capturedError?.exitCode).toEqual(1);
      expect(capturedError?.stderr).toContain(
        `Option --package conflicts with supplied test regex`,
      );
    });

    it('errors when specifying a regex with --package', async () => {
      let capturedError;
      try {
        await execa(
          'yarnpkg',
          [
            'modular',
            'test',
            'memoize.test.ts',
            '--package',
            'modular-scripts',
          ],
          {
            all: true,
            cleanup: true,
          },
        );
      } catch (error) {
        capturedError = error as ExecaError;
      }
      expect(capturedError?.exitCode).toEqual(1);
      expect(capturedError?.stderr).toContain(
        `Option --package conflicts with supplied test regex`,
      );
    });

    it('errors when specifying a regex with --changed', async () => {
      let capturedError;
      try {
        await execa(
          'yarnpkg',
          ['modular', 'test', 'memoize.test.ts', '--changed'],
          {
            all: true,
            cleanup: true,
          },
        );
      } catch (error) {
        capturedError = error as ExecaError;
      }
      expect(capturedError?.exitCode).toEqual(1);
      expect(capturedError?.stderr).toContain(
        `Option --changed conflicts with supplied test regex`,
      );
    });

    it('errors when specifying --compareBranch without --changed', async () => {
      let capturedError;
      try {
        await execa('yarnpkg', ['modular', 'test', '--compareBranch', 'main'], {
          all: true,
          cleanup: true,
        });
      } catch (error) {
        capturedError = error as ExecaError;
      }
      expect(capturedError?.exitCode).toEqual(1);
      expect(capturedError?.stderr).toContain(
        `Option --compareBranch doesn't make sense without option --changed`,
      );
    });
  });
});

function runRemoteModularTest(
  modularFolder: string,
  cwd: string,
  modularArguments: string[],
) {
  return execa.sync(
    path.join(modularFolder, '/node_modules/.bin/ts-node'),
    [
      path.join(modularFolder, '/packages/modular-scripts/src/cli.ts'),
      ...modularArguments,
    ],
    {
      cwd,
      env: {
        ...process.env,
        CI: 'true',
      },
    },
  );
}
