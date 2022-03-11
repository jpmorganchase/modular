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
          "dist-cjs",
          "dist-es",
          "dist-types",
          "README.md",
        ],
        "main": "dist-cjs/index.js",
        "modular": Object {
          "type": "package",
        },
        "module": "dist-es/index.js",
        "name": "sample-async-package",
        "private": false,
        "typings": "dist-types/index.d.ts",
        "version": "1.0.0",
      }
    `);
  });

  it('THEN expects the correct output directory structure', () => {
    expect(tree(path.join(modularRoot, 'dist', 'sample-async-package')))
      .toMatchInlineSnapshot(`
      "sample-async-package
      ├─ dist-cjs
      │  ├─ index.js #y5z0kw
      │  ├─ index.js.map #1ppp712
      │  ├─ runAsync.js #kr3qrh
      │  └─ runAsync.js.map #18daxam
      ├─ dist-es
      │  ├─ index.js #7arwpf
      │  ├─ index.js.map #1in842g
      │  ├─ runAsync.js #1tt0e7o
      │  └─ runAsync.js.map #1qvfs9
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
