import execa from 'execa';
import rimraf from 'rimraf';
import puppeteer from 'puppeteer';
import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';

import {
  getDocument,
  getQueriesForElement,
  queries,
} from 'pptr-testing-library';

import getModularRoot from '../getModularRoot';

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

function getBrowser() {
  return puppeteer.launch(
    process.env.CI
      ? {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        }
      : {},
  );
}

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd: modularRoot,
    ...opts,
  });
}

async function startApp(appPath: string): Promise<DevServer> {
  // See: https://github.com/jpmorganchase/modular/issues/54
  // See: https://github.com/jpmorganchase/modular/pull/45/files#r473007124

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
        return resolve();
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

afterAll(() => {
  rimraf.sync(path.join(packagesPath, 'sample-app'));
  rimraf.sync(path.join(packagesPath, 'sample-view'));
  rimraf.sync(path.join(packagesPath, 'sample-package'));
  // run yarn so yarn.lock gets reset
  return execa('yarnpkg', [], {
    cwd: modularRoot,
  });
});

describe('modular-scripts', () => {
  it('can add an app', async () => {
    await modular('add sample-app --unstable-type=app', { stdio: 'inherit' });

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
      │  ├─ favicon.ico #5z38jq
      │  ├─ index.html #1wohq3p
      │  ├─ logo192.png #y3vsw8
      │  ├─ logo512.png #n8nzep
      │  ├─ manifest.json #19gah8o
      │  └─ robots.txt #1sjb8b3
      ├─ src
      │  ├─ App.css #1o0zosm
      │  ├─ App.tsx #igvgtx
      │  ├─ __tests__
      │  │  └─ App.test.tsx #lrjomi
      │  ├─ index.css #o7sk21
      │  ├─ index.tsx #zdn6mw
      │  ├─ logo.svg #1okqmlj
      │  └─ react-app-env.d.ts #1dm2mq6
      └─ tsconfig.json #6rw46b"
    `);
  });

  // eslint-disable-next-line
  it.skip('can start an app', async () => {
    if (process.env.CI) {
      // don't run this on CI
      // TODO: must fix this
      // See: https://github.com/jpmorganchase/modular/issues/54
      // See: https://github.com/jpmorganchase/modular/pull/45/files#r473007124
      return;
    }
    let browser: puppeteer.Browser | undefined;
    let devServer: DevServer | undefined;
    try {
      await fs.copyFile(
        path.join(__dirname, 'TestApp.test-tsx'),
        path.join(packagesPath, 'sample-app', 'src', 'App.tsx'),
      );

      browser = await getBrowser();
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
  });

  it('can add a view', async () => {
    await modular('add sample-view --unstable-type=view', { stdio: 'inherit' });
    expect(tree(path.join(packagesPath, 'sample-view'))).toMatchInlineSnapshot(`
      "sample-view
      ├─ README.md #11adaka
      ├─ __tests__
      │  └─ index.test.tsx #14vgq12
      ├─ index.tsx #fxrie0
      └─ package.json"
    `);
  });

  it('can add a package', async () => {
    await modular('add sample-package --unstable-type=package', {
      stdio: 'inherit',
    });
    expect(tree(path.join(packagesPath, 'sample-package')))
      .toMatchInlineSnapshot(`
      "sample-package
      ├─ README.md #1jv3l2q
      ├─ __tests__
      │  └─ index.test.ts #1qvvmz7
      ├─ index.ts #1woe74n
      └─ package.json"
    `);
  });

  // eslint-disable-next-line
  it.skip('can execute tests', async () => {
    // TODO: This isn't right, see https://github.com/jpmorganchase/modular/issues/130
    // skipping till we figure it out

    // We want to omit any information that makes our snapshots
    // fragile and therefore censor times using `?`.
    function censorVariableTimes(str: string | undefined) {
      if (!str) {
        return undefined;
      }

      // This replaces the times (e.g. 3.4s or 6788ms) with `?`.
      return str.replace(/[\d.]+(\s*m?s)/g, '?$1');
    }

    const output = await modular('test sample-app sample-package sample-view', {
      all: true,
      reject: false,
      env: {
        CI: 'true',
      },
    });

    // I think this is wrong, it's not running tests
    // in sample-package and sample-view
    expect(censorVariableTimes(output.all)).toMatchInlineSnapshot(`
      "$ ts-node packages/modular-scripts/src/cli.ts test sample-app sample-package sample-view
      PASS ../sample-app/src/__tests__/App.test.tsx
        ✓ renders learn react link (? ms)

      Test Suites: 1 passed, 1 total
      Tests:       1 passed, 1 total
      Snapshots:   0 total
      Time:        ? s, estimated ? s
      Ran all test suites matching /sample-app|sample-package|sample-view/i."
    `);
    // run this last so we're sure it runs all tests
  });
});
