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

// eslint-disable-next-line @typescript-eslint/unbound-method
const { getNodeText } = queries;

const modularRoot = getModularRoot();

// These tests must be executed sequentially with `--runInBand`.
jest.setTimeout(10 * 60 * 1000);

const packagesPath = path.join(getModularRoot(), 'packages');

const skipIfCI = process.env.CI ? it.skip : it;

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
  // run yarn so yarn.lock gets reset
  return execa.sync('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(cleanup);
afterAll(cleanup);

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
      ├─ asset-manifest.json #d9mm4w
      ├─ favicon.ico #6pu3rg
      ├─ index.html #15ve80l
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ robots.txt #1sjb8b3
      └─ static
         ├─ css
         │  ├─ main.8bcbd900.chunk.css #xno22u
         │  └─ main.8bcbd900.chunk.css.map #9wvvfl
         └─ js
            ├─ 2.fe4bf1bd.chunk.js #1bpavcu
            ├─ 2.fe4bf1bd.chunk.js.LICENSE.txt #eplx8h
            ├─ 2.fe4bf1bd.chunk.js.map #1yp1aqn
            ├─ main.fb6fdc37.chunk.js #13wv077
            ├─ main.fb6fdc37.chunk.js.map #16r4uew
            ├─ runtime-main.45650a35.js #7ikulh
            └─ runtime-main.45650a35.js.map #mgczg9"
    `);
  });

  skipIfCI('can start an app', async () => {
    // Ok, so. Sunil's decided to get the new M1 MacBook Air. Some software doesn't run on it
    // well yet. Particularly the puppeteer npm package failes to install and run
    // (see https://github.com/puppeteer/puppeteer/issues/, issues #6634 and #6641,
    // possible fix in pull #6495)

    // Because of this, he's marked puppeteer in optionalDependencies, so it's failure to install
    // doesn't block everything else. Further, because this particular test is already flaky,
    // it's disabled when running locally. However, because it fails to install, it causes
    // typescript and eslint failures. Hence the need to disable those errors for now.

    // It's Sunil's responsibility to fix this when better, so shout at him if he doesn't.

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

    // This seems to be leaving hanging processes locally,
    // so marking this test as a no-op for now. Sigh.
    if (!process.env.CI) {
      return;
    }

    const puppeteer = require('puppeteer');

    // @ts-expect-error FIXME
    let browser: puppeteer.Browser | undefined;
    let devServer: DevServer | undefined;
    let port: string;
    try {
      await fs.copyFile(
        path.join(__dirname, 'TestApp.test-tsx'),
        path.join(packagesPath, 'sample-app', 'src', 'App.tsx'),
      );

      browser = await puppeteer.launch(
        process.env.CI
          ? {
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
            }
          : {},
      );
      port = '3000';
      devServer = await startApp('sample-app', { env: { PORT: port } });

      const page = await browser.newPage();
      await page.goto(`http://localhost:${port}`, {});

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { getByTestId, findByTestId } = getQueriesForElement(
        await getDocument(page),
      );

      await findByTestId('test-this');

      // eslint-disable-next-line testing-library/no-await-sync-query, jest/no-standalone-expect
      expect(await getNodeText(await getByTestId('test-this'))).toBe(
        'this is a modular app',
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
});
