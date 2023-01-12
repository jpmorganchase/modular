import * as path from 'path';
import * as fs from 'fs-extra';

import execa from 'execa';
import { createModularTestContext, runModular } from '../test/utils';
import getModularRoot from '../utils/getModularRoot';

const modularRoot = getModularRoot();
const fixturesFolder = path.join(__dirname, '__fixtures__', 'lint');
const relativeFixturePath = fixturesFolder.replace(modularRoot, '');

// Temporary text context paths
let tempModularRepo: string;

function setupLintErrors(): string[] {
  tempModularRepo = createModularTestContext();
  const tempFixturesFolder = path.join(tempModularRepo, relativeFixturePath);
  fs.mkdirsSync(tempFixturesFolder);
  const files = fs.readdirSync(fixturesFolder);
  return files.map((file) => {
    fs.writeFileSync(
      path.join(tempFixturesFolder, file),
      fs
        .readFileSync(path.join(fixturesFolder, file), 'utf-8')
        .replace('/* eslint-disable */', '///'),
    );
    return path.join(tempFixturesFolder, file);
  });
}

describe('Modular lint', () => {
  let lintedFiles: string[];
  describe('when the codebase has linting errors', () => {
    beforeEach(() => {
      lintedFiles = setupLintErrors();
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
            cwd: tempModularRepo,
            all: true,
            cleanup: true,
          },
        );
      } catch ({ stdout }) {
        eslintLogs = (stdout as string).split('\n').filter((l: string) => l);
      }
      let modularLogs: string[] = [];
      try {
        await runModular(tempModularRepo, 'lint __fixtures__/lint');
      } catch ({ stderr }) {
        modularLogs = (stderr as string).split('\n');
      }
      eslintLogs.forEach((el) => {
        expect(modularLogs.find((ml) => el.includes(ml))).toBeDefined();
      });
    });
    it('should not pass lint test', async () => {
      let modularLogs: string[] = [];
      try {
        await runModular(tempModularRepo, 'lint __fixtures__/lint');
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
      const files = fs.readdirSync(fixturesFolder);
      const result = await runModular(modularRoot, 'lint __fixtures__/lint');
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
