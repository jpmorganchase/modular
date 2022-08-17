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
      '__fixtures__',
      'ghost-testing',
    );
    const currentModularFolder = getModularRoot();
    let randomOutputFolder: string;

    beforeEach(async () => {
      // Create random dir
      randomOutputFolder = tmp.dirSync({ unsafeCleanup: true }).name;
      fs.copySync(fixturesFolder, randomOutputFolder);

      // Get all the files, recursively, and rename the .incognito files
      const fileList = await getFileList(randomOutputFolder);
      // Generate an array of promises that we can wait parallely on with Promise.all
      await Promise.all(
        fileList.reduce<Promise<void>[]>((acc, filePath) => {
          if (path.basename(filePath) === 'package.json.incognito') {
            acc.push(
              fs.rename(
                filePath,
                path.join(path.dirname(filePath), 'package.json'),
              ),
            );
          }
          return acc;
        }, []),
      );

      // Create git repo & commit
      console.log('GIT_AUTHOR_NAME:', process.env.GIT_AUTHOR_NAME);
      console.log('GIT_AUTHOR_EMAIL:', process.env.GIT_AUTHOR_EMAIL);
      execa.sync('git', ['init'], {
        cwd: randomOutputFolder,
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 'Modular Tests',
          GIT_AUTHOR_EMAIL: 'tests@modular.js.org',
        },
      });
      execa.sync('yarn', {
        cwd: randomOutputFolder,
      });
      execa.sync('git', ['add', '.'], {
        cwd: randomOutputFolder,
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 'Modular Tests',
          GIT_AUTHOR_EMAIL: 'tests@modular.js.org',
        },
      });
      execa.sync('git', ['commit', '-am', '"First commit"'], {
        cwd: randomOutputFolder,
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 'Modular Tests',
          GIT_AUTHOR_EMAIL: 'tests@modular.js.org',
        },
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

// Recursively get all files in a directory and its subdirectories
async function getFileList(dirName: string): Promise<string[]> {
  let files: string[] = [];
  const items = await fs.readdir(dirName, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      files = [...files, ...(await getFileList(`${dirName}/${item.name}`))];
    } else {
      files.push(`${dirName}/${item.name}`);
    }
  }

  return files;
}
