import * as path from 'path';
import * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import stripAnsi from 'strip-ansi';
import * as tmp from 'tmp';
import plugin from '../../build-scripts/esbuild-scripts/plugins/moduleScopePlugin';
import { formatError } from '../../build-scripts/esbuild-scripts/utils/formatError';
import getModularRoot from '../../utils/getModularRoot';
import type { Paths } from '../../build-scripts/common-scripts/determineTargetPaths';

const emptyDir = async (dirName: string) => {
  await fs.emptyDir(dirName);
};

describe('WHEN running esbuild with the svgrPlugin', () => {
  describe("WHEN there's a url import", () => {
    let tmpDir: tmp.DirResult;
    let result: esbuild.BuildResult;
    let outdir: string;

    beforeAll(async () => {
      tmpDir = tmp.dirSync();
      outdir = path.join(tmpDir.name, 'output');
      try {
        result = await esbuild.build({
          entryPoints: [
            path.join(
              __dirname,
              '__fixtures__',
              'module-scope',
              'src',
              'index.tsx',
            ),
          ],
          plugins: [
            plugin({
              appSrc: path.join(
                __dirname,
                '__fixtures__',
                'module-scope',
                'src',
              ),
            } as Paths),
          ],
          logLevel: 'silent',
          outdir,
          sourceRoot: getModularRoot(),
          bundle: true,
          splitting: true,
          format: 'esm',
          target: 'es2021',
        });
      } catch (buildError) {
        result = buildError as esbuild.BuildResult;
      }
    });

    afterAll(async () => {
      await emptyDir(tmpDir.name);
      tmpDir.removeCallback();
    });

    it('SHOULD produce no warnings', () => {
      expect(result.warnings).toMatchInlineSnapshot(`[]`);
    });

    it('SHOULD produce an error', async () => {
      expect(result.errors).toHaveLength(1);
      const error = result.errors[0];
      const { text, ...err } = error;
      expect(err).toMatchInlineSnapshot(`
        {
          "detail": undefined,
          "id": "",
          "location": {
            "column": 20,
            "file": "packages/modular-scripts/src/__tests__/esbuild-scripts/__fixtures__/module-scope/src/index.tsx",
            "length": 8,
            "line": 1,
            "lineText": "import { foo } from '../foo';",
            "namespace": "",
            "suggestion": "",
          },
          "notes": [],
          "pluginName": "ModuleScopePlugin",
        }
      `);
      expect(stripAnsi(text)).toMatchInlineSnapshot(`
        "You attempted to import ../foo which falls outside of the project packages/modular-scripts/src/__tests__/esbuild-scripts/__fixtures__/module-scope/src directory. 
        Relative imports outside of packages/modular-scripts/src/__tests__/esbuild-scripts/__fixtures__/module-scope/src are not supported.
        You can either move it inside packages/modular-scripts/src/__tests__/esbuild-scripts/__fixtures__/module-scope/src, or move it to another modular package."
      `);

      const formattedError = stripAnsi(await formatError(error));
      expect(formattedError).toMatchInlineSnapshot(`
        "Error:[packages/modular-scripts/src/__tests__/esbuild-scripts/__fixtures__/module-scope/src/index.tsx] You attempted to import ../foo which falls outside of the project packages/modular-scripts/src/__tests__/esbuild-scripts/__fixtures__/module-scope/src directory. 
        Relative imports outside of packages/modular-scripts/src/__tests__/esbuild-scripts/__fixtures__/module-scope/src are not supported.
        You can either move it inside packages/modular-scripts/src/__tests__/esbuild-scripts/__fixtures__/module-scope/src, or move it to another modular package.
          
        > 1 | import { foo } from '../foo';
            |                    ^
          2 |
          3 | foo();
          4 |
            "
      `);
    });
  });
});
