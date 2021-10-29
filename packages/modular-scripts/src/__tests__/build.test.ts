import execa from 'execa';
import { promisify } from 'util';
import _rimraf from 'rimraf';
import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';

const rimraf = promisify(_rimraf);

const modularRoot = getModularRoot();

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd: modularRoot,
    cleanup: true,
    ...opts,
  });
}

async function cleanup() {
  const packagesPath = path.join(getModularRoot(), 'packages');

  await rimraf(path.join(packagesPath, 'sample-async-package'));
  // run yarn so yarn.lock gets reset
  await execa('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

describe('WHEN building with preserve modules', () => {
  beforeAll(async () => {
    await modular(
      'add sample-async-package --unstable-type package --unstable-name sample-async-package',
      {
        stdio: 'inherit',
      },
    );

    const packageSrc = path.join(
      getModularRoot(),
      'packages',
      'sample-async-package',
      'src',
    );
    await fs.emptyDir(packageSrc);
    await fs.copy(
      path.join(__dirname, '__fixtures__', 'packages', 'sample-async-package'),
      packageSrc,
    );

    // build a package too, but preserve modules
    await modular('build sample-async-package --preserve-modules', {
      stdio: 'inherit',
    });
  });

  it('THEN expects the correct output package.json', async () => {
    expect(
      await fs.readJson(
        path.join(modularRoot, 'dist', 'sample-async-package', 'package.json'),
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
        "name": "sample-async-package",
        "typings": "dist-types/index.d.ts",
        "version": "1.0.0",
      }
    `);
  });

  it('THEN expects the correct output directory structure', () => {
    expect(tree(path.join(modularRoot, 'dist', 'sample-async-package')))
      .toMatchInlineSnapshot(`
      "sample-async-package
      ├─ README.md #1jv3l2q
      ├─ dist-cjs
      │  ├─ _virtual
      │  │  ├─ _rollupPluginBabelHelpers.js #8zp60f
      │  │  └─ _rollupPluginBabelHelpers.js.map #1a6wdsa
      │  ├─ index.js #sb8xfb
      │  ├─ index.js.map #r9dxe
      │  ├─ runAsync.js #1vge02m
      │  └─ runAsync.js.map #1thrwz0
      ├─ dist-es
      │  ├─ _virtual
      │  │  ├─ _rollupPluginBabelHelpers.js #14tvdhd
      │  │  └─ _rollupPluginBabelHelpers.js.map #4hotzf
      │  ├─ index.js #1lz39tw
      │  ├─ index.js.map #6hlu18
      │  ├─ runAsync.js #1xha07g
      │  └─ runAsync.js.map #1u7bzfv
      ├─ dist-types
      │  ├─ index.d.ts #12l2tmi
      │  └─ runAsync.d.ts #1iek7az
      └─ package.json"
    `);
  });

  it('SHOULD create the correct index.js', () => {
    expect(
      String(
        fs.readFileSync(
          path.join(
            getModularRoot(),
            'dist',
            'sample-async-package',
            'dist-es',
            'index.js',
          ),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('SHOULD create the correct runAsync.js', () => {
    expect(
      String(
        fs.readFileSync(
          path.join(
            getModularRoot(),
            'dist',
            'sample-async-package',
            'dist-es',
            'runAsync.js',
          ),
        ),
      ),
    ).toMatchSnapshot();
  });
});
