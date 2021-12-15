import execa, { ExecaError } from 'execa';
import path from 'path';
import * as fs from 'fs-extra';

const fixturesFolder = path.join(__dirname, '__fixtures__', 'test');

function setupTests() {
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

function clearTests() {
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

describe('Modular test', () => {
  beforeEach(() => {
    setupTests();
  });

  afterEach(() => {
    clearTests();
  });
  describe('when the tests fail', () => {
    it('should exit with an error', async () => {
      let errorNumber = 0;
      try {
        await execa(
          'yarnpkg',
          ['modular', 'test', '--watchAll=false', 'test/InvalidTest.test.ts'],
          {
            all: true,
            cleanup: true,
          },
        );
      } catch (error) {
        errorNumber = (error as ExecaError).exitCode;
      }
      expect(errorNumber).toBe(1);
    });
  });

  describe('when the tests pass', () => {
    it('should exit with no error', async () => {
      let errorNumber = 0;
      try {
        await execa(
          'yarnpkg',
          ['modular', 'test', '--watchAll=false', 'test/ValidTest.test.ts'],
          {
            all: true,
            cleanup: true,
          },
        );
      } catch (error) {
        errorNumber = (error as ExecaError).exitCode;
      }
      expect(errorNumber).toBe(0);
    });
  });
});
