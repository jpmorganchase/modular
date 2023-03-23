import * as path from 'path';
import * as fs from 'fs-extra';
import {
  createModularTestContext,
  getRealModularRootInTest,
} from '../test/utils';

const modularRoot = getRealModularRootInTest();
const fixturesFolder = path.join(__dirname, '__fixtures__', 'typecheck');

describe('Modular typecheck', () => {
  describe('when there are type errors', () => {
    let tempModularRepo: string;
    let tempFixturesFolder: string;

    beforeEach(() => {
      jest.resetModules();
      tempModularRepo = createModularTestContext();
      tempFixturesFolder = path.join(tempModularRepo, 'packages', 'app', 'src');
      fs.mkdirsSync(tempFixturesFolder);
      const invalidTsContent = fs
        .readFileSync(path.join(fixturesFolder, 'InvalidTyping.ts'))
        .toString()
        .replaceAll('@ts-nocheck', '');
      fs.writeFileSync(
        path.join(tempFixturesFolder, 'InvalidTyping.ts'),
        invalidTsContent,
      );
      fs.copyFileSync(
        path.join(modularRoot, 'tsconfig.json'),
        path.join(tempModularRepo, 'tsconfig.json'),
      );

      jest.doMock('../utils/actionPreflightCheck', () => {
        return {
          __esModule: true,
          default: (fn: (...args: unknown[]) => Promise<void>) => {
            return fn;
          },
        };
      });

      jest.doMock('../utils/getModularRoot', () => {
        return {
          __esModule: true,
          default: () => tempModularRepo,
        };
      });
    });

    describe('when in CI', () => {
      beforeEach(() => {
        process.env.CI = 'true';
      });
      afterEach(() => {
        process.env.CI = undefined;
      });
      it('should display truncated errors', async () => {
        const typecheck = await import('../typecheck');
        let caughtError: Error | undefined;
        const expectedErrorText = [
          "Cannot find module 'foo' or its corresponding type declarations",
          "A function whose declared type is neither 'void' nor 'any' must return a value.",
        ];
        try {
          await typecheck.default({}, []);
        } catch (e) {
          caughtError = e as Error;
        } finally {
          expect(caughtError).toBeTruthy();
          for (const msg of expectedErrorText) {
            expect(caughtError?.message.includes(msg)).toBe(true);
          }
        }
      });
    });

    describe('when not in CI', () => {
      it('should match display full error logs', async () => {
        const typecheck = await import('../typecheck');
        let caughtError: Error | undefined;
        const expectedErrorText = [
          "Cannot find module 'foo' or its corresponding type declarations",
          "A function whose declared type is neither 'void' nor 'any' must return a value.",
        ];
        try {
          await typecheck.default({}, []);
        } catch (e) {
          caughtError = e as Error;
        } finally {
          expect(caughtError).toBeTruthy();
          for (const msg of expectedErrorText) {
            expect(caughtError?.message.includes(msg)).toBe(true);
          }
        }
      });
    });
  });
});
