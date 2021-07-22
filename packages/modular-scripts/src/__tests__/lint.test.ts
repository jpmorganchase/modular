import * as path from 'path';
import * as fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';
import execa from 'execa';

const fixturesFolder = path.join(__dirname, '__fixtures__', 'lint');

let lintedFiles: string[];

function setupLintErrors() {
  const files = fs.readdirSync(path.join(fixturesFolder));
  lintedFiles = files.map((file) => {
    fs.writeFileSync(
      path.join(fixturesFolder, file),
      fs
        .readFileSync(path.join(fixturesFolder, file), 'utf-8')
        .replace('/* eslint-disable */', '///'),
    );
    return path.join(fixturesFolder, file);
  });
}

function clearLintErrors() {
  const files = fs.readdirSync(path.join(fixturesFolder));
  files.forEach((file) => {
    fs.writeFileSync(
      path.join(fixturesFolder, file),
      fs
        .readFileSync(path.join(fixturesFolder, file), 'utf-8')
        .replace('///', '/* eslint-disable */'),
    );
  });
  lintedFiles = [];
}

const modularRoot = getModularRoot();

describe('Modular lint', () => {
  describe('when the codebase has linting errors', () => {
    beforeEach(() => {
      setupLintErrors();
    });
    afterEach(() => {
      clearLintErrors();
    });
    it('should print the eslint errors', async () => {
      let eslintLogs: string[] = [];
      try {
        await execa(
          'eslint',
          [
            'packages/modular-scripts/src/__tests__/__fixtures__/lint',
            '--ext',
            '.js,.jsx,.ts,.tsx',
            '--max-warnings',
            '0',
          ],
          {
            cwd: modularRoot,
            all: true,
            cleanup: true,
          },
        );
      } catch ({ stdout }) {
        eslintLogs = (stdout as string).split('\n').filter((l: string) => l);
      }
      let modularLogs: string[] = [];
      try {
        await execa('yarnpkg', ['modular', 'lint', '__fixtures__/lint'], {
          all: true,
          cleanup: true,
          cwd: modularRoot,
        });
      } catch ({ stderr }) {
        modularLogs = (stderr as string).split('\n');
      }
      eslintLogs.forEach((el) => {
        expect(modularLogs.find((ml) => el.includes(ml))).not.toBeUndefined();
      });
    });
    it('should not pass lint test', async () => {
      let modularLogs: string[] = [];
      try {
        await execa('yarnpkg', ['modular', 'lint', '__fixtures__/lint'], {
          all: true,
          cleanup: true,
          cwd: modularRoot,
        });
      } catch ({ stderr }) {
        modularLogs = (stderr as string).split('\n');
      }
      expect(modularLogs).toContain(
        `Test Suites: ${lintedFiles.length} failed, ${lintedFiles.length} total`,
      );
      expect(modularLogs.filter((l) => l.startsWith('FAIL lint'))).toHaveLength(
        lintedFiles.length,
      );
    });
  });
  describe('when the codebase does not have lint errors', () => {
    it('should pass the lint tests', async () => {
      const files = fs.readdirSync(path.join(fixturesFolder));
      const result = await execa(
        'yarnpkg',
        ['modular', 'lint', '__fixtures__/lint'],
        {
          all: true,
          cleanup: true,
          cwd: modularRoot,
        },
      );
      const modularLogs: string[] = result.stderr.split('\n');
      expect(modularLogs).toContain(
        `Test Suites: ${files.length} passed, ${files.length} total`,
      );
      expect(modularLogs.filter((l) => l.startsWith('PASS lint'))).toHaveLength(
        files.length,
      );
    });
  });
});
