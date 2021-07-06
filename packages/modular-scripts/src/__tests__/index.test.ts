import execa from 'execa';
import { exec } from 'child_process';
import rimraf from 'rimraf';
import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';

import {
  getDocument,
  getQueriesForElement,
  queries,
} from 'pptr-testing-library';

import getModularRoot from '../utils/getModularRoot';

import { startApp, DevServer } from './start-app';

const modularRoot = getModularRoot();

// eslint-disable-next-line @typescript-eslint/unbound-method
const { getNodeText } = queries;

// These tests must be executed sequentially with `--runInBand`.
jest.setTimeout(10 * 60 * 1000);

const packagesPath = path.join(getModularRoot(), 'packages');

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd: modularRoot,
    cleanup: true,
    ...opts,
  });
}

function cleanup() {
  rimraf.sync(path.join(packagesPath, 'sample-view'));
  rimraf.sync(path.join(packagesPath, 'sample-package'));
  rimraf.sync(path.join(packagesPath, 'nested'));
  rimraf.sync(path.join(modularRoot, 'dist/sample-view'));
  rimraf.sync(path.join(modularRoot, 'dist/sample-package'));
  rimraf.sync(path.join(modularRoot, 'dist/nested'));
  // run yarn so yarn.lock gets reset
  return execa.sync('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('modular-scripts', () => {
  it('can add a view', async () => {
    await modular(
      'add sample-view --unstable-type view --unstable-name sample-view',
      { stdio: 'inherit' },
    );
    expect(tree(path.join(packagesPath, 'sample-view'))).toMatchInlineSnapshot(`
      "sample-view
      ├─ README.md #11adaka
      ├─ package.json
      └─ src
         ├─ __tests__
         │  └─ index.test.tsx #slarlz
         └─ index.tsx #fxrie0"
    `);
  });

  it('can start a view', async () => {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    if (!process.env.CI) {
      return;
    }

    const puppeteer = require('puppeteer');

    // @ts-expect-error FIXME
    let browser: puppeteer.Browser | undefined;
    let devServer: DevServer | undefined;
    let port: string;
    try {
      const targetedView = 'sample-view';
      await fs.copyFile(
        path.join(__dirname, 'TestView.test-tsx'),
        path.join(packagesPath, targetedView, 'src', 'index.tsx'),
      );

      browser = await puppeteer.launch(
        process.env.CI
          ? {
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
            }
          : {},
      );
      port = '4000';
      devServer = await startApp(targetedView, { env: { PORT: port } });

      const page = await browser.newPage();
      await page.goto(`http://localhost:${port}`, {});

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { getByTestId, findByTestId } = getQueriesForElement(
        await getDocument(page),
      );

      await findByTestId('test-this');

      // eslint-disable-next-line testing-library/no-await-sync-query
      expect(await getNodeText(await getByTestId('test-this'))).toBe(
        'this is a modular view',
      );
    } finally {
      if (browser) {
        await browser.close();
      }
      if (devServer) {
        // this is the problematic bit, it leaves hanging node processes
        // despite closing the parent process. Only happens in tests!
        devServer.kill();
      }
    }
    if (port) {
      // kill all processes listening to the dev server port
      exec(
        `lsof -n -i4TCP:${port} | grep LISTEN | awk '{ print $2 }' | xargs kill`,
        (err) => {
          if (err) {
            console.log('err: ', err);
          }
          console.log(`Cleaned up processes on port ${port}`);
        },
      );
    }

    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
  });

  it('can build a view', async () => {
    rimraf.sync(path.join(packagesPath, 'sample-view'));
    rimraf.sync(path.join(modularRoot, 'dist'));

    await modular(
      'add sample-view --unstable-type view --unstable-name sample-view',
      { stdio: 'inherit' },
    );

    await modular('build sample-view', {
      stdio: 'inherit',
    });

    expect(
      await fs.readJson(
        path.join(modularRoot, 'dist', 'sample-view', 'package.json'),
      ),
    ).toMatchInlineSnapshot(`
      Object {
        "dependencies": Object {
          "react": "^17.0.2",
        },
        "files": Array [
          "/dist-cjs",
          "/dist-es",
          "/dist-types",
          "README.md",
        ],
        "license": "UNLICENSED",
        "main": "dist-cjs/sample-view.cjs.js",
        "modular": Object {
          "type": "view",
        },
        "module": "dist-es/sample-view.es.js",
        "name": "sample-view",
        "typings": "dist-types/src/index.d.ts",
        "version": "1.0.0",
      }
    `);

    expect(tree(path.join(modularRoot, 'dist', 'sample-view')))
      .toMatchInlineSnapshot(`
      "sample-view
      ├─ README.md #11adaka
      ├─ dist-cjs
      │  ├─ sample-view.cjs.js #8jw6cg
      │  └─ sample-view.cjs.js.map #130r3z8
      ├─ dist-es
      │  ├─ sample-view.es.js #1ctbbz8
      │  └─ sample-view.es.js.map #12deywy
      ├─ dist-types
      │  └─ src
      │     └─ index.d.ts #1vloh7q
      └─ package.json"
    `);
  });

  it('can add a package', async () => {
    await modular(
      'add sample-package --unstable-type package --unstable-name sample-package',
      {
        stdio: 'inherit',
      },
    );
    expect(tree(path.join(packagesPath, 'sample-package')))
      .toMatchInlineSnapshot(`
      "sample-package
      ├─ README.md #1jv3l2q
      ├─ package.json
      └─ src
         ├─ __tests__
         │  └─ index.test.ts #1qvvmz7
         └─ index.ts #1woe74n"
    `);
  });

  it('can add a nested package', async () => {
    await modular(
      'add nested/sample-nested-package --unstable-type package --unstable-name @nested/sample-package',
      {
        stdio: 'inherit',
      },
    );
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

  it('can execute tests', async () => {
    const output = await modular(
      'test sample-package sample-view sample-nested-package --watchAll false',
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
      'PASS packages/sample-view/src/__tests__/index.test.tsx',
    );
    expect(cleanedOutput).toContain(
      'PASS packages/sample-package/src/__tests__/index.test.ts',
    );
    expect(cleanedOutput).toContain(
      'PASS packages/nested/sample-nested-package/src/__tests__/index.test.ts',
    );
  });

  it('can build packages', async () => {
    // cleanup anything built previously
    rimraf.sync(path.join(modularRoot, 'dist'));

    // build a package too, but preserve modules
    await modular('build sample-package --preserve-modules', {
      stdio: 'inherit',
    });
    // build the nested package
    await modular('build @nested/sample-package', {
      stdio: 'inherit',
    });

    expect(
      await fs.readJson(
        path.join(modularRoot, 'dist', 'sample-package', 'package.json'),
      ),
    ).toMatchInlineSnapshot(`
      Object {
        "dependencies": Object {},
        "files": Array [
          "/dist-cjs",
          "/dist-es",
          "/dist-types",
          "README.md",
        ],
        "license": "UNLICENSED",
        "main": "dist-cjs/index.js",
        "module": "dist-es/index.js",
        "name": "sample-package",
        "typings": "dist-types/src/index.d.ts",
        "version": "1.0.0",
      }
    `);

    expect(
      await fs.readJson(
        path.join(modularRoot, 'dist', 'nested-sample-package', 'package.json'),
      ),
    ).toMatchInlineSnapshot(`
      Object {
        "dependencies": Object {},
        "files": Array [
          "/dist-cjs",
          "/dist-es",
          "/dist-types",
          "README.md",
        ],
        "license": "UNLICENSED",
        "main": "dist-cjs/nested-sample-package.cjs.js",
        "module": "dist-es/nested-sample-package.es.js",
        "name": "@nested/sample-package",
        "typings": "dist-types/src/index.d.ts",
        "version": "1.0.0",
      }
    `);

    expect(tree(path.join(modularRoot, 'dist'))).toMatchInlineSnapshot(`
      "dist
      ├─ nested-sample-package
      │  ├─ README.md #1jv3l2q
      │  ├─ dist-cjs
      │  │  ├─ nested-sample-package.cjs.js #kv2xzp
      │  │  └─ nested-sample-package.cjs.js.map #j26x67
      │  ├─ dist-es
      │  │  ├─ nested-sample-package.es.js #40jnpo
      │  │  └─ nested-sample-package.es.js.map #11g8lh9
      │  ├─ dist-types
      │  │  └─ src
      │  │     └─ index.d.ts #f68aj
      │  └─ package.json
      └─ sample-package
         ├─ README.md #1jv3l2q
         ├─ dist-cjs
         │  ├─ index.js #rq9uxe
         │  └─ index.js.map #ys8x0i
         ├─ dist-es
         │  ├─ index.js #1gjntzw
         │  └─ index.js.map #b17359
         ├─ dist-types
         │  └─ src
         │     └─ index.d.ts #f68aj
         └─ package.json"
    `);
  });
});
