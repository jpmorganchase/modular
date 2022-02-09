import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import tree from 'tree-view-for-tests';
import svgrPlugin from '../../esbuild-scripts/plugins/svgr';
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
          path.join(__dirname, '__fixtures__', 'svgr-url', 'index.tsx'),
        ],
        plugins: [svgrPlugin()],
        // so that we don't get huge output sizes...
        external: ['react', 'react-dom'],
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
      expect(tree(outdir, { hashIgnores: ['index.js'] }))
        .toMatchInlineSnapshot(`
        "output
        ├─ index.js
        └─ logo-5JCTDEME.svg #lzkq0q"
      `);
    });

    it('SHOULD ouput the correct index.js', () => {
      let content = String(fs.readFileSync(path.join(outdir, 'index.js')));
      content = content.replaceAll(getModularRoot(), '');
      expect(content).toMatchSnapshot();
    });

    it('SHOULD ouput the correct logo.svg', () => {
      let content = String(
        fs.readFileSync(path.join(outdir, 'logo-5JCTDEME.svg')),
      );
      content = content.replaceAll(getModularRoot(), '');
      expect(content).toMatchSnapshot();
    });
  });

  describe("WHEN there's a component import", () => {
    let tmpDir: tmp.DirResult;
    let result: esbuild.BuildResult;
    let outdir: string;

    beforeAll(async () => {
      tmpDir = tmp.dirSync();
      outdir = path.join(tmpDir.name, 'output');
      result = await esbuild.build({
        entryPoints: [
          path.join(__dirname, '__fixtures__', 'svgr-component', 'index.tsx'),
        ],
        plugins: [svgrPlugin()],
        // so that we don't get huge output sizes...
        external: ['react', 'react-dom'],
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
      expect(tree(outdir, { hashIgnores: ['index.js'] }))
        .toMatchInlineSnapshot(`
        "output
        └─ index.js"
      `);
    });

    it('SHOULD ouput the correct index.js', () => {
      let content = String(fs.readFileSync(path.join(outdir, 'index.js')));
      content = content.replaceAll(getModularRoot(), '');
      expect(content).toMatchSnapshot();
    });
  });

  describe("WHEN there's a dataurl import", () => {
    let tmpDir: tmp.DirResult;
    let result: esbuild.BuildResult;
    let outdir: string;

    beforeAll(async () => {
      tmpDir = tmp.dirSync();
      outdir = path.join(tmpDir.name, 'output');
      result = await esbuild.build({
        entryPoints: [
          path.join(__dirname, '__fixtures__', 'svgr-dataurl', 'index.tsx'),
        ],
        plugins: [svgrPlugin()],
        // so that we don't get huge output sizes...
        external: ['react', 'react-dom'],
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
      expect(tree(outdir, { hashIgnores: ['index.js'] }))
        .toMatchInlineSnapshot(`
        "output
        ├─ index.css #5f8lem
        └─ index.js"
      `);
    });

    it('SHOULD ouput the correct index.js', () => {
      let content = String(fs.readFileSync(path.join(outdir, 'index.js')));
      content = content.replaceAll(getModularRoot(), '');
      expect(content).toMatchSnapshot();
    });

    it('SHOULD ouput the correct index.css', () => {
      let content = String(fs.readFileSync(path.join(outdir, 'index.css')));
      content = content.replaceAll(getModularRoot(), '');
      expect(content).toMatchSnapshot();
    });
  });
});
