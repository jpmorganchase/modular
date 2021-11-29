import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import tree from 'tree-view-for-tests';
import webworkerPlugin from '../../esbuild-scripts/plugins/workerFactoryPlugin';
import getModularRoot from '../../utils/getModularRoot';

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
      result = await esbuild.build({
        entryPoints: [
          path.join(__dirname, '__fixtures__', 'worker-plugin', 'index.ts'),
        ],
        plugins: [webworkerPlugin()],
        outdir,
        sourceRoot: getModularRoot(),
        bundle: true,
        splitting: true,
        format: 'esm',
        target: 'es2021',
      });
    });

    afterAll(async () => {
      await emptyDir(tmpDir.name);
      tmpDir.removeCallback();
    });

    it('SHOULD be successful', () => {
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('SHOULD have the correct output structure', () => {
      expect(tree(outdir)).toMatchInlineSnapshot(`
        "output
        ├─ alive.worker-MLBJYZMX.ts #1qkw5er
        └─ index.js #co48du"
      `);
    });

    it('SHOULD ouput the correct index.js', () => {
      let content = String(fs.readFileSync(path.join(outdir, 'index.js')));
      content = content.replaceAll(getModularRoot(), '');
      expect(content).toMatchSnapshot();
    });

    it('SHOULD ouput the correct alive.worker-MLBJYZMX.ts', () => {
      let content = String(
        fs.readFileSync(path.join(outdir, 'alive.worker-MLBJYZMX.ts')),
      );
      content = content.replaceAll(getModularRoot(), '');
      expect(content).toMatchSnapshot();
    });
  });
});
