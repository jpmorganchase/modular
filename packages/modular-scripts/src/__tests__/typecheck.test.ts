import * as path from 'path';
import * as fs from 'fs-extra';
import execa from 'execa';

jest.setTimeout(10 * 60 * 1000);

const fixturesFolder = path.join(__dirname, '__fixtures__');

describe('Modular typecheck', () => {
  describe('when there are type errors', () => {
    beforeEach(() => {
      fs.writeFileSync(
        path.join(fixturesFolder, 'typecheck', 'InvalidTyping.ts'),
        fs
          .readFileSync(
            path.join(fixturesFolder, 'typecheck', 'InvalidTyping.ts'),
            'utf-8',
          )
          .replace('//@ts-nocheck', '//'),
      );
    });

    afterEach(() => {
      fs.writeFileSync(
        path.join(fixturesFolder, 'typecheck', 'InvalidTyping.ts'),
        fs
          .readFileSync(
            path.join(fixturesFolder, 'typecheck', 'InvalidTyping.ts'),
            'utf-8',
          )
          .replace('//', '//@ts-nocheck'),
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
          });
        } catch ({ stdout }) {
          tsc = stdout as string;
        }
        let modularStdErr = '';
        try {
          await execa('yarnpkg', ['modular', 'typecheck'], {
            all: true,
            cleanup: true,
          });
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
          });
        } catch ({ stdout }) {
          tsc = stdout as string;
        }
        let modularStdErr = '';
        try {
          await execa('yarnpkg', ['modular', 'typecheck'], {
            all: true,
            cleanup: true,
          });
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
      const result = await execa('yarnpkg', ['modular', 'typecheck'], {
        all: true,
        cleanup: true,
      });
      expect(result.stdout).toMatch('\u2713 Typecheck passed');
    });
  });
});
