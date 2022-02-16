import execa from 'execa';
import { exec } from 'child_process';
import { promisify } from 'util';
import _rimraf from 'rimraf';
import tree from 'tree-view-for-tests';
import path from 'path';
import puppeteer from 'puppeteer';
import {
  getDocument,
  getQueriesForElement,
  queries,
} from 'pptr-testing-library';
import fs from 'fs-extra';

import { startApp, DevServer } from './start-app';
import getModularRoot from '../utils/getModularRoot';

const rimraf = promisify(_rimraf);

const modularRoot = getModularRoot();

// eslint-disable-next-line @typescript-eslint/unbound-method
const { getNodeText } = queries;

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
  await rimraf(path.join(packagesPath, 'sample-view'));
  await rimraf(path.join(modularRoot, 'dist/sample-view'));
  // run yarn so yarn.lock gets reset
  await execa('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

const targetedView = 'sample-view';

describe('modular-scripts', () => {
  beforeAll(async () => {
    await cleanup();

    await modular(
      'add sample-view --unstable-type view --unstable-name sample-view',
      { stdio: 'inherit' },
    );

    await fs.copyFile(
      path.join(__dirname, 'TestView.test-tsx'),
      path.join(packagesPath, targetedView, 'src', 'index.tsx'),
    );
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('Adds packages correctly', () => {
    it('can add a view', () => {
      expect(tree(path.join(packagesPath, 'sample-view')))
        .toMatchInlineSnapshot(`
        "sample-view
        ├─ README.md #11adaka
        ├─ package.json
        └─ src
           ├─ __tests__
           │  └─ index.test.tsx #slarlz
           └─ index.tsx #19kersg"
      `);
    });
  });

  describe('WHEN starting a view', () => {
    let browser: puppeteer.Browser;
    let devServer: DevServer;
    let port: string;

    beforeAll(async () => {
      const launchArgs: puppeteer.LaunchOptions &
        puppeteer.BrowserLaunchArgumentOptions = {
        // always run in headless - if you want to debug this locally use the env var to
        headless: !Boolean(process.env.NO_HEADLESS_TESTS),
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };

      browser = await puppeteer.launch(launchArgs);
      port = '3000';
      devServer = await startApp(targetedView, { env: { PORT: port } });
    });

    afterAll(async () => {
      if (browser) {
        await browser.close();
      }
      if (devServer) {
        // this is the problematic bit, it leaves hanging node processes
        // despite closing the parent process. Only happens in tests!
        devServer.kill();
      }
      if (port) {
        // kill all processes listening to the dev server port
        exec(
          `lsof -n -i4TCP:${port} | grep LISTEN | awk '{ print $2 }' | xargs kill -9`,
          (err) => {
            if (err) {
              console.log('err: ', err);
            }
            console.log(`Cleaned up processes on port ${port}`);
          },
        );
      }
    });

    it('THEN can start a view', async () => {
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
    });
  });

  describe('WHEN building a view', () => {
    beforeAll(async () => {
      await modular('build sample-view', {
        stdio: 'inherit',
      });
    });

    it('THEN outputs the correct package.json in the dist directory', async () => {
      expect(
        await fs.readJson(
          path.join(modularRoot, 'dist', 'sample-view', 'package.json'),
        ),
      ).toMatchInlineSnapshot(`
        Object {
          "bundledDependencies": Array [],
          "dependencies": Object {
            "react": "17.0.2",
          },
          "license": "UNLICENSED",
          "modular": Object {
            "type": "view",
          },
          "module": "static/js/index-IC6FL6E2.js",
          "name": "sample-view",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-view')))
        .toMatchInlineSnapshot(`
        "sample-view
        ├─ index.html #1o286v3
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #1atamnv
              ├─ index-IC6FL6E2.js #19sl0ps
              └─ index-IC6FL6E2.js.map #1sysx0b"
      `);
    });
  });

  it('can execute tests', async () => {
    const output = await modular(
      'test sample-view sample-nested-package --watchAll false',
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
      'PASS test packages/sample-view/src/__tests__/index.test.tsx',
    );
  });
});
