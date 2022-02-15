import execa from 'execa';
import { promisify } from 'util';
import _rimraf from 'rimraf';
import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';
import { ModularPackageJson } from '../utils/isModularType';

const rimraf = promisify(_rimraf);

const modularRoot = getModularRoot();

// These tests must be executed sequentially with `--runInBand`.

const packagesPath = path.join(getModularRoot(), 'packages');

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd: modularRoot,
    cleanup: true,
    ...opts,
  });
}

async function cleanup() {
  await rimraf(path.join(packagesPath, 'sample-package'));
  await rimraf(path.join(packagesPath, 'nested'));
  await rimraf(path.join(modularRoot, 'dist/sample-package'));
  await rimraf(path.join(modularRoot, 'dist/nested'));
  // run yarn so yarn.lock gets reset
  await execa('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

describe('modular-scripts', () => {
  beforeAll(async () => {
    await cleanup();
    await modular(
      'add sample-package --unstable-type package --unstable-name sample-package',
      {
        stdio: 'inherit',
      },
    );
    await modular(
      'add nested/sample-nested-package --unstable-type package --unstable-name @nested/sample-package',
      {
        stdio: 'inherit',
      },
    );

    await fs.writeFile(
      path.join(
        packagesPath,
        'sample-package',
        'src',
        '__tests__',
        'mock-util.tsx',
      ),
      `
    export default function() {
      console.log("Just a util");
    }`,
    );
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('Adds packages correctly', () => {
    it('can add a package', () => {
      expect(tree(path.join(packagesPath, 'sample-package')))
        .toMatchInlineSnapshot(`
        "sample-package
        ├─ README.md #1jv3l2q
        ├─ package.json
        └─ src
           ├─ __tests__
           │  ├─ index.test.ts #1qvvmz7
           │  └─ mock-util.tsx #rjzbd3
           └─ index.ts #1woe74n"
      `);
    });

    it('can add a nested package', () => {
      expect(tree(path.join(packagesPath, 'nested/sample-nested-package')))
        .toMatchInlineSnapshot(`
        "sample-nested-package
        ├─ README.md #1jv3l2q
        ├─ package.json
        └─ src
           ├─ __tests__
           │  └─ index.test.ts #1qvvmz7
           └─ index.ts #1woe74n"
      `);
    });
  });

  it('can execute tests', async () => {
    const output = await modular(
      'test sample-package sample-nested-package --watchAll false',
      {
        all: true,
        reject: false,
        env: {
          CI: 'true',
        },
      },
    );

    // TODO: Passing CI=true *should* remove all the coloring stuff,
    // it's weird that it doesn't. To workaround it, I've manually
    // removed those tokens from the string for the snapshot test.
    // Open to suggestions/fixes.

    // eslint-disable-next-line no-control-regex
    const cleanedOutput = output.all?.replace(/|\[\d+./gm, '');

    expect(cleanedOutput).toContain(
      'PASS test packages/sample-package/src/__tests__/index.test.ts',
    );
    expect(cleanedOutput).toContain(
      'PASS test packages/nested/sample-nested-package/src/__tests__/index.test.ts',
    );
  });

  describe('WHEN building with preserve modules', () => {
    beforeAll(async () => {
      // build a package too, but preserve modules
      await modular('build sample-package --preserve-modules', {
        stdio: 'inherit',
      });
    });

    it('THEN expects the correct output package.json', async () => {
      expect(
        await fs.readJson(
          path.join(modularRoot, 'dist', 'sample-package', 'package.json'),
        ),
      ).toMatchInlineSnapshot(`
        Object {
          "dependencies": Object {},
          "files": Array [
            "README.md",
            "dist-cjs",
            "dist-es",
            "dist-types",
          ],
          "license": "UNLICENSED",
          "main": "dist-cjs/index.js",
          "module": "dist-es/index.js",
          "name": "sample-package",
          "typings": "dist-types/index.d.ts",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN expects the correct output directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-package')))
        .toMatchInlineSnapshot(`
        "sample-package
        ├─ README.md #1jv3l2q
        ├─ dist-cjs
        │  ├─ index.js #rq9uxe
        │  └─ index.js.map #17f4e4r
        ├─ dist-es
        │  ├─ index.js #3bszhr
        │  └─ index.js.map #8kaoa5
        ├─ dist-types
        │  └─ index.d.ts #f68aj
        └─ package.json"
      `);
    });

    it.each(['main', 'module', 'typings'])(
      'THEN validates the typings file exists: %s',
      async (key: keyof ModularPackageJson) => {
        const packageJson = (await fs.readJSON(
          path.join(modularRoot, 'dist', 'sample-package', 'package.json'),
        )) as ModularPackageJson;
        const value = packageJson[key] as string;
        expect(
          fs
            .statSync(path.join(modularRoot, 'dist', 'sample-package', value))
            .isFile(),
        ).toEqual(true);
      },
    );
  });

  describe('WHEN building without preserve modules', () => {
    beforeAll(async () => {
      // build the nested package
      await modular('build @nested/sample-package --preserve-modules false', {
        stdio: 'inherit',
      });
    });

    it('THEN creates the correct package.json output', async () => {
      expect(
        await fs.readJson(
          path.join(
            modularRoot,
            'dist',
            'nested-sample-package',
            'package.json',
          ),
        ),
      ).toMatchInlineSnapshot(`
        Object {
          "dependencies": Object {},
          "files": Array [
            "README.md",
            "dist-cjs",
            "dist-es",
            "dist-types",
          ],
          "license": "UNLICENSED",
          "main": "dist-cjs/nested-sample-package.cjs.js",
          "module": "dist-es/nested-sample-package.es.js",
          "name": "@nested/sample-package",
          "typings": "dist-types/index.d.ts",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN outputs the right directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'nested-sample-package')))
        .toMatchInlineSnapshot(`
        "nested-sample-package
        ├─ README.md #1jv3l2q
        ├─ dist-cjs
        │  ├─ nested-sample-package.cjs.js #kv2xzp
        │  └─ nested-sample-package.cjs.js.map #wxcsbr
        ├─ dist-es
        │  ├─ nested-sample-package.es.js #11z6hlv
        │  └─ nested-sample-package.es.js.map #12ht1cr
        ├─ dist-types
        │  └─ index.d.ts #f68aj
        └─ package.json"
      `);
    });

    it.each(['main', 'module', 'typings'])(
      'THEN validates the typings file exists: %s',
      async (key: keyof ModularPackageJson) => {
        const packageJson = (await fs.readJSON(
          path.join(
            modularRoot,
            'dist',
            'nested-sample-package',
            'package.json',
          ),
        )) as ModularPackageJson;
        const value = packageJson[key] as string;
        expect(
          fs
            .statSync(
              path.join(modularRoot, 'dist', 'nested-sample-package', value),
            )
            .isFile(),
        ).toEqual(true);
      },
    );
  });
});
