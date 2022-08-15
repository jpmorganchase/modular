import execa, { ExecaError } from 'execa';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

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
    let randomOutputFolder: string;

    beforeEach(() => {
      // Create random dir
      randomOutputFolder = fs.mkdtempSync(path.join(os.tmpdir()));
      fs.copySync(fixturesFolder, randomOutputFolder);
      console.log(randomOutputFolder);
      // Create git repo & commit
      execa.sync('git', ['init'], { cwd: randomOutputFolder });
      execa.sync('yarn', {
        cwd: randomOutputFolder,
      });
      execa.sync('git', ['add', '.'], { cwd: randomOutputFolder });
      execa.sync('git', ['commit', '-am', '"First commit"'], {
        cwd: randomOutputFolder,
      });
    });

    it('does 1+1', () => {
      expect(1 + 1).toEqual(2);
    });
  });
});
