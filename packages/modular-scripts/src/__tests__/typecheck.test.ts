import * as path from 'path';
import * as fs from 'fs-extra';
import execa from 'execa';
import { createModularTestContext, runYarnModular } from '../test/utils';
import getModularRoot from '../utils/getModularRoot';

const modularRoot = getModularRoot();
const fixturesFolder = path.join(__dirname, '__fixtures__', 'typecheck');
const relativeFixturePath = fixturesFolder.replace(modularRoot, '');

describe('Modular typecheck', () => {
  describe('when there are type errors', () => {
    let tempModularRepo: string;
    let tempFixturesFolder: string;
    beforeEach(() => {
      tempModularRepo = createModularTestContext();
      tempFixturesFolder = path.join(tempModularRepo, relativeFixturePath);
      fs.mkdirsSync(tempFixturesFolder);
      fs.writeFileSync(
        path.join(tempFixturesFolder, 'InvalidTyping.ts'),
        fs
          .readFileSync(path.join(fixturesFolder, 'InvalidTyping.ts'), 'utf-8')
          .replace('//@ts-nocheck', '//'),
      );
      fs.copyFileSync(
        path.join(modularRoot, 'packages', 'modular-scripts', 'tsconfig.json'),
        path.join(tempModularRepo, 'tsconfig.json'),
      );
    });

    describe('when in CI', () => {
      beforeEach(() => {
        process.env.CI = 'true';
      });
      afterEach(() => {
        process.env.CI = undefined;
      });
      it('should display truncated errors', async () => {
        let tsc = '';
        try {
          await execa('tsc', ['--noEmit', '--pretty', 'false'], {
            all: true,
            cleanup: true,
            cwd: tempModularRepo,
          });
        } catch ({ stdout }) {
          tsc = stdout as string;
        }
        let modularStdErr = '';
        try {
          await runYarnModular(tempModularRepo, 'typecheck');
        } catch ({ stderr }) {
          modularStdErr = stderr as string;
        }
        const tscErrors = tsc.split('\n');
        const modularErrors = modularStdErr.split('\n');
        tscErrors.forEach((errorMessage: string, i: number) => {
          expect(modularErrors[i]).toMatch(errorMessage);
        });
      });
    });
    describe('when not in CI', () => {
      it('should match display full error logs', async () => {
        let tsc = '';
        try {
          await execa('tsc', ['--noEmit'], {
            all: true,
            cleanup: true,
            cwd: tempModularRepo,
          });
        } catch ({ stdout }) {
          tsc = stdout as string;
        }
        let modularStdErr = '';
        try {
          await runYarnModular(tempModularRepo, 'typecheck');
        } catch ({ stderr }) {
          modularStdErr = stderr as string;
        }
        const tscErrors = tsc.split('\n');
        const modularErrors = modularStdErr.split('\n');
        tscErrors.forEach((errorMessage: string, i: number) => {
          expect(modularErrors[i]).toMatch(errorMessage);
        });
      });
    });
  });
  describe('when there are no type errors', () => {
    it('should print a one line success message', async () => {
      const result = await runYarnModular(modularRoot, 'typecheck');
      expect(result.stdout).toMatch('\u2713 Typecheck passed');
    });
  });
});
