import * as path from 'path';
import * as fs from 'fs-extra';
import {
  createModularTestContext,
  getRealModularRootInTest,
} from '../test/utils';
import { mockPreflightImplementation } from '../test/mockFunctions';

const modularRoot = getRealModularRootInTest();

// Skip preflight in tests (faster, avoids the need to mock getModularRoot statically)
jest.mock('../utils/actionPreflightCheck', () => mockPreflightImplementation);

describe('Modular typecheck', () => {
  describe('not using selective options', () => {
    let tempModularRepo: string;
    let tempFixturesFolder: string;

    beforeEach(() => {
      /**
       * - Set up a temp modular repo
       * - Copy the `typecheck` fixture into it
       * - Remove a `ts-nocheck` statement so that errors will happen as expected
       */
      tempModularRepo = createModularTestContext();
      tempFixturesFolder = path.join(tempModularRepo, 'packages', 'app', 'src');
      fs.mkdirsSync(tempFixturesFolder);
      const fixturesFolder = path.join(__dirname, '__fixtures__', 'typecheck');
      const invalidTsContent = fs
        .readFileSync(path.join(fixturesFolder, 'InvalidTyping.ts'))
        .toString()
        .replaceAll('@ts-nocheck', '');
      fs.writeFileSync(
        path.join(tempFixturesFolder, 'InvalidTyping.ts'),
        invalidTsContent,
      );
      // Must be recognized as a modular workspace to be type-checked
      fs.writeJsonSync(
        path.join(tempModularRepo, 'packages', 'app', 'package.json'),
        {
          name: 'modular-template-app',
          version: '2.0.0',
          modular: {
            type: 'template',
            templateType: 'app',
          },
        },
      );
      fs.copyFileSync(
        path.join(modularRoot, 'tsconfig.json'),
        path.join(tempModularRepo, 'tsconfig.json'),
      );

      // Mock the modular root per temporary modular repo
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
        const { default: typecheck } = await import('../typecheck');
        let caughtError: Error | undefined;
        const expectedErrorText = [
          "Cannot find module 'foo' or its corresponding type declarations",
          "A function whose declared type is neither 'void' nor 'any' must return a value.",
        ];
        try {
          await typecheck({}, []);
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
        const { default: typecheck } = await import('../typecheck');
        let caughtError: Error | undefined;
        const expectedErrorText = [
          "Cannot find module 'foo' or its corresponding type declarations",
          "A function whose declared type is neither 'void' nor 'any' must return a value.",
        ];
        try {
          await typecheck({}, []);
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

  describe('using selective options', () => {
    let tempModularRepo: string;

    beforeEach(() => {
      // Required to achieve consistency when using `jest.doMock` in tests
      jest.resetModules();

      /**
       * - Set up a temp modular repo
       * - Copy the `selective-typecheck-example` fixture into it (3 packages within)
       * - Remove a `ts-nocheck` statement so that errors will happen as expected
       */
      tempModularRepo = createModularTestContext();
      fs.copySync(
        path.join(
          modularRoot,
          '__fixtures__',
          'selective-typecheck-example',
          'packages',
        ),
        path.join(tempModularRepo, 'packages'),
      );
      const invalidTsContent = fs
        .readFileSync(
          path.join(
            modularRoot,
            '__fixtures__',
            'selective-typecheck-example',
            'packages',
            'common-module',
            'src',
            'index.ts',
          ),
        )
        .toString()
        .replaceAll('@ts-nocheck', '');
      fs.writeFileSync(
        path.join(
          tempModularRepo,
          'packages',
          'common-module',
          'src',
          'index.ts',
        ),
        invalidTsContent,
      );

      // Mock the modular root per temporary modular repo
      jest.doMock('../utils/getModularRoot', () => {
        return {
          __esModule: true,
          default: () => tempModularRepo,
        };
      });
    });

    it('should test descendants and throw', async () => {
      const { default: typecheck } = await import('../typecheck');
      let caughtError: Error | undefined;
      const expectedErrorText = [
        "Type 'string' is not assignable to type 'number'.",
        "Parameter 'input' implicitly has an 'any' type.",
      ];
      try {
        await typecheck({ descendants: true }, ['webpack-app']);
      } catch (e) {
        caughtError = e as Error;
      } finally {
        expect(caughtError).toBeTruthy();
        for (const msg of expectedErrorText) {
          expect(caughtError?.message.includes(msg)).toBe(true);
        }
      }
    });

    it('should not test descendants and not error', async () => {
      const { default: typecheck } = await import('../typecheck');
      let caughtError: Error | undefined;
      try {
        await typecheck({ descendants: false }, ['webpack-app']);
      } catch (e) {
        caughtError = e as Error;
      } finally {
        expect(caughtError).toBeUndefined();
      }
    });
  });

  describe('using allowlisted compiler options', () => {
    let tempModularRepo: string;

    beforeEach(() => {
      // Required to achieve consistency when using `jest.doMock` in tests
      jest.resetModules();

      /**
       * - Set up a temp modular repo
       * - Copy the `selective-typecheck-example` fixture into it (3 packages within)
       * - Create a custom `tsconfig.json` that uses allowlisted compiler options
       */
      tempModularRepo = createModularTestContext();
      fs.copySync(
        path.join(
          modularRoot,
          '__fixtures__',
          'selective-typecheck-example',
          'packages',
        ),
        path.join(tempModularRepo, 'packages'),
      );
      // eslint-disable-next-line
      const tsconfigContent: Record<string, any> = JSON.parse(
        fs.readFileSync(path.join(modularRoot, 'tsconfig.json')).toString(),
      );
      const updatedTsConfig = {
        ...tsconfigContent,
        include: ['packages/**/src'],
        compilerOptions: {
          jsx: 'preserve',
        },
      };
      fs.writeFileSync(
        path.join(tempModularRepo, 'tsconfig.json'),
        JSON.stringify(updatedTsConfig),
      );

      // Mock the modular root per temporary modular repo
      jest.doMock('../utils/getModularRoot', () => {
        return {
          __esModule: true,
          default: () => tempModularRepo,
        };
      });
    });

    it('accepts a non-default ("preserve") value for `jsx`', async () => {
      // This option has no effect on typecheck, since typecheck doesn't emit.
      // So, we just check that typecheck doesn't throw.
      const { default: typecheck } = await import('../typecheck');
      await expect(typecheck({}, [])).resolves.not.toThrow();
    });
  });
});
