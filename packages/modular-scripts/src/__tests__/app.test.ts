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
import puppeteer from 'puppeteer';

import { startApp, DevServer } from './start-app';

// eslint-disable-next-line @typescript-eslint/unbound-method
const { getNodeText } = queries;

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

function cleanup() {
  rimraf.sync(path.join(packagesPath, 'sample-app'));
  rimraf.sync(path.join(modularRoot, 'dist/sample-app'));

  rimraf.sync(path.join(packagesPath, 'scoped/sample-app'));
  rimraf.sync(path.join(modularRoot, 'dist/scoped-sample-app'));

  // run yarn so yarn.lock gets reset
  return execa.sync('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('When working with a nested app', () => {
  beforeAll(async () => {
    await modular(
      'add scoped/sample-app --unstable-type app --unstable-name @scoped/sample-app',
      { stdio: 'inherit' },
    );
  });

  it('can build a nested app', async () => {
    await modular('build @scoped/sample-app', {
      stdio: 'inherit',
    });

    expect(tree(path.join(modularRoot, 'dist', 'scoped-sample-app')))
      .toMatchInlineSnapshot(`
      "scoped-sample-app
      ├─ asset-manifest.json #56wf93
      ├─ favicon.ico #6pu3rg
      ├─ index.html #16nh34
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ robots.txt #1sjb8b3
      └─ static
         ├─ css
         │  ├─ main.f09a1402.chunk.css #1db4ooj
         │  └─ main.f09a1402.chunk.css.map #1sxvdk1
         └─ js
            ├─ 2.928f002b.chunk.js #rc6z5l
            ├─ 2.928f002b.chunk.js.LICENSE.txt #eplx8h
            ├─ 2.928f002b.chunk.js.map #13hx5k0
            ├─ main.301a9b5d.chunk.js #1y03mcv
            ├─ main.301a9b5d.chunk.js.map #133lc1b
            ├─ runtime-main.90523c3e.js #vchyhf
            └─ runtime-main.90523c3e.js.map #stcog7"
    `);
  });
});

describe('when working with an app', () => {
  beforeAll(async () => {
    await modular(
      'add sample-app --unstable-type app --unstable-name sample-app',
      { stdio: 'inherit' },
    );

    // Let's replace the App module with something of our own
    // with a test specific element we can introspect
    await fs.copyFile(
      path.join(__dirname, 'TestApp.test-tsx'),
      path.join(packagesPath, 'sample-app', 'src', 'App.tsx'),
    );
  });

  it('can add an app', () => {
    expect(tree(path.join(packagesPath, 'sample-app'))).toMatchInlineSnapshot(`
        "sample-app
        ├─ package.json
        ├─ public
        │  ├─ favicon.ico #6pu3rg
        │  ├─ index.html #1wohq3p
        │  ├─ logo192.png #1nez7vk
        │  ├─ logo512.png #1hwqvcc
        │  ├─ manifest.json #19gah8o
        │  └─ robots.txt #1sjb8b3
        ├─ src
        │  ├─ App.css #1o0zosm
        │  ├─ App.tsx #igvgtx
        │  ├─ __tests__
        │  │  └─ App.test.tsx #16urcos
        │  ├─ index.css #o7sk21
        │  ├─ index.tsx #zdn6mw
        │  ├─ logo.svg #1okqmlj
        │  └─ react-app-env.d.ts #t4ygcy
        └─ tsconfig.json #6rw46b"
      `);
  });

  it('can build an app', async () => {
    await modular('build sample-app', {
      stdio: 'inherit',
    });

    expect(tree(path.join(modularRoot, 'dist', 'sample-app')))
      .toMatchInlineSnapshot(`
      "sample-app
      ├─ asset-manifest.json #11r4gus
      ├─ favicon.ico #6pu3rg
      ├─ index.html #1l8nrn6
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ robots.txt #1sjb8b3
      └─ static
         ├─ css
         │  ├─ main.f09a1402.chunk.css #1db4ooj
         │  └─ main.f09a1402.chunk.css.map #1sxvdk1
         └─ js
            ├─ 2.9da65802.chunk.js #ls3f41
            ├─ 2.9da65802.chunk.js.LICENSE.txt #eplx8h
            ├─ 2.9da65802.chunk.js.map #1wl9rc5
            ├─ main.b20ef164.chunk.js #12tx661
            ├─ main.b20ef164.chunk.js.map #z7f7vz
            ├─ runtime-main.46d4e883.js #1tf2izh
            └─ runtime-main.46d4e883.js.map #e0v9b3"
    `);
  });

  it('can execute tests', async () => {
    const output = await modular('test sample-app --watchAll false', {
      all: true,
      reject: false,
      env: {
        CI: 'true',
      },
    });

    // TODO: Passing CI=true *should* remove all the coloring stuff,
    // it's weird that it doesn't. To workaround it, I've manually
    // removed those tokens from the string for the snapshot test.
    // Open to suggestions/fixes.

    // eslint-disable-next-line no-control-regex
    const cleanedOutput = output.all?.replace(/|\[\d+./gm, '');

    expect(cleanedOutput).toContain(
      'PASS test packages/sample-app/src/__tests__/App.test.tsx',
    );
  });

  it('can start an app', async () => {
    let browser: puppeteer.Browser | undefined;
    let devServer: DevServer | undefined;
    let port: string;
    try {
      await fs.copyFile(
        path.join(__dirname, 'TestApp.test-tsx'),
        path.join(packagesPath, 'sample-app', 'src', 'App.tsx'),
      );

      browser = await puppeteer.launch({
        // always run in headless - if you want to debug this locally use the env var to
        headless: !Boolean(process.env.NO_HEADLESS_TESTS),
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      port = '3000';
      devServer = await startApp('sample-app', { env: { PORT: port } });

      const page = await browser.newPage();
      await page.goto(`http://localhost:${port}`, {});

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { getByTestId, findByTestId } = getQueriesForElement(
        await getDocument(page),
      );

      await findByTestId('test-this');

      const element = getByTestId('test-this');

      expect(await getNodeText(await element)).toBe('this is a modular app');
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
  });
});
