import execa from 'execa';
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

const modularRoot = getModularRoot();

const START_APP_TIMEOUT = 60 * 1000;

interface DevServer {
  kill: () => void;
}
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

async function startApp(appPath: string): Promise<DevServer> {
  const devServer = modular(`start ${appPath}`, {
    cleanup: true,
  });

  await new Promise((resolve, reject) => {
    if (!devServer.stdout) {
      return reject(
        new Error(
          'The dev server could not produce any output on /dev/stdout.',
        ),
      );
    }

    if (!devServer.stderr) {
      return reject(
        new Error(
          'The dev server could not produce any output on /dev/stderr.',
        ),
      );
    }

    // If the Promise has completed we need to bail out of any further handlers that
    // are executed, because otherwise we can end up trying to log after tests are done.
    // We use a 'completed' variable to do this -- in an ideal world we'd cleanup
    // the listeners.
    //
    // See: https://github.com/jpmorganchase/modular/pull/107#discussion_r493791918
    let completed = false;

    const startAppTimeout = setTimeout(() => {
      if (completed) return;

      completed = true;
      reject(
        new Error(
          `The app at ${appPath} never started within the configured ${START_APP_TIMEOUT}ms timeout period.`,
        ),
      );
    }, START_APP_TIMEOUT);

    devServer.stdout.on('data', (data: Buffer) => {
      if (completed) return;

      const output = data.toString();
      if (/Something is already running on port (\d+)./.test(output)) {
        clearTimeout(startAppTimeout);

        completed = true;
        return reject(new Error(output));
      }
      if (/Compiled successfully!/.test(output)) {
        clearTimeout(startAppTimeout);

        completed = true;
        return resolve(true);
      }
    });

    devServer.stderr.on('data', (data: Buffer) => {
      if (completed) return;

      const output = data.toString();

      console.error(output);

      clearTimeout(startAppTimeout);

      completed = true;
      return reject(new Error(output));
    });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    devServer.on('error', (err: Error) => {
      if (completed) return;

      console.error(err);

      clearTimeout(startAppTimeout);

      completed = true;
      reject(err);
    });
  });

  // We can't return the raw execa child process,
  // because we need to `await` until the dev server
  // starts above, but don't want to wait until the
  // process itself finishes.
  return {
    kill: () => {
      devServer.kill('SIGKILL');
      return devServer;
    },
  };
}

function cleanup() {
  rimraf.sync(path.join(packagesPath, 'sample-app'));
  rimraf.sync(path.join(packagesPath, 'sample-view'));
  rimraf.sync(path.join(packagesPath, 'sample-package'));
  rimraf.sync(path.join(packagesPath, 'nested'));
  rimraf.sync(path.join(modularRoot, 'dist'));
  // run yarn so yarn.lock gets reset
  return execa.sync('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('modular-scripts', () => {
  it('can add an app', async () => {
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
      │  └─ react-app-env.d.ts #1dm2mq6
      └─ tsconfig.json #6rw46b"
    `);
  });

  it('can start an app', async () => {
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
      devServer = await startApp('sample-app');

      const page = await browser.newPage();
      await page.goto('http://localhost:3000', {});

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { getByTestId, findByTestId } = getQueriesForElement(
        await getDocument(page),
      );

      await findByTestId('test-this');

      // eslint-disable-next-line testing-library/no-await-sync-query
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

    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
  });

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
      devServer = await startApp(targetedView);

      const page = await browser.newPage();
      await page.goto('http://localhost:3000', {});

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

    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
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
      'test sample-app sample-package sample-view sample-nested-package --watchAll false',
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
      'PASS packages/sample-app/src/__tests__/App.test.tsx',
    );
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

  it('can build libraries', async () => {
    // cleanup anything built previously
    rimraf.sync(path.join(modularRoot, 'dist'));

    // build a view
    await modular('build sample-view', { stdio: 'inherit' });
    // build a package too, but preserve modules
    await modular('build sample-package --preserve-modules', {
      stdio: 'inherit',
    });
    // build the nested package
    await modular('build nested/sample-nested-package', {
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

    expect(
      await fs.readJson(
        path.join(
          modularRoot,
          'dist',
          'nested/sample-nested-package',
          'package.json',
        ),
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
      ├─ nested
      │  └─ sample-nested-package
      │     ├─ README.md #1jv3l2q
      │     ├─ dist-cjs
      │     │  ├─ nested-sample-package.cjs.js #kv2xzp
      │     │  └─ nested-sample-package.cjs.js.map #j26x67
      │     ├─ dist-es
      │     │  ├─ nested-sample-package.es.js #40jnpo
      │     │  └─ nested-sample-package.es.js.map #11g8lh9
      │     ├─ dist-types
      │     │  └─ src
      │     │     └─ index.d.ts #f68aj
      │     └─ package.json
      ├─ sample-package
      │  ├─ README.md #1jv3l2q
      │  ├─ dist-cjs
      │  │  ├─ index.js #rq9uxe
      │  │  └─ index.js.map #ys8x0i
      │  ├─ dist-es
      │  │  ├─ index.js #1gjntzw
      │  │  └─ index.js.map #b17359
      │  ├─ dist-types
      │  │  └─ src
      │  │     └─ index.d.ts #f68aj
      │  └─ package.json
      └─ sample-view
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
});
