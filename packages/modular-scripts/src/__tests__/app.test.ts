import execa from 'execa';
import { exec } from 'child_process';
import rimraf from 'rimraf';
import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';
import prettier from 'prettier';

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

    await modular('build @scoped/sample-app', {
      stdio: 'inherit',
    });
  });

  it('can build a nested app', () => {
    expect(tree(path.join(modularRoot, 'dist', 'scoped-sample-app')))
      .toMatchInlineSnapshot(`
      "scoped-sample-app
      ├─ asset-manifest.json #1byi6x
      ├─ favicon.ico #6pu3rg
      ├─ index.html #156km9k
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ robots.txt #1sjb8b3
      └─ static
         ├─ css
         │  ├─ main.a0f92c83.chunk.css #16n5nfq
         │  └─ main.a0f92c83.chunk.css.map #1l7oeeo
         └─ js
            ├─ 2.00d55a9b.chunk.js #16ph1qi
            ├─ 2.00d55a9b.chunk.js.LICENSE.txt #5bztxc
            ├─ 2.00d55a9b.chunk.js.map #10dfdjc
            ├─ main.c07064da.chunk.js #137hee8
            ├─ main.c07064da.chunk.js.map #pzt59x
            ├─ runtime-main.40725930.js #g9u7z2
            └─ runtime-main.40725930.js.map #u3ma7d"
    `);
  });

  it('can generate a asset-manifest', async () => {
    expect(
      String(
        await fs.readFile(
          path.join(
            modularRoot,
            'dist',
            'scoped-sample-app',
            'asset-manifest.json',
          ),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('can generate a manifest', async () => {
    expect(
      String(
        await fs.readFile(
          path.join(modularRoot, 'dist', 'scoped-sample-app', 'manifest.json'),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('can generate a index.html', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(modularRoot, 'dist', 'scoped-sample-app', 'index.html'),
          ),
        ),
        {
          filepath: 'index.html',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a css/main.a0f92c83.chunk.css', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'scoped-sample-app',
              'static',
              'css',
              'main.a0f92c83.chunk.css',
            ),
          ),
        ),
        {
          filepath: 'main.a0f92c83.chunk.css',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a css/main.a0f92c83.chunk.css.map', async () => {
    expect(
      JSON.parse(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'scoped-sample-app',
              'static',
              'css',
              'main.a0f92c83.chunk.css.map',
            ),
          ),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('can generate a js/main.c07064da.chunk.js', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'scoped-sample-app',
              'static',
              'js',
              'main.c07064da.chunk.js',
            ),
          ),
        ),
        {
          filepath: 'main.c07064da.chunk.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a js/runtime-main.40725930.js', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'scoped-sample-app',
              'static',
              'js',
              'runtime-main.40725930.js',
            ),
          ),
        ),
        {
          filepath: 'runtime-main.40725930.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a js/2.00d55a9b.chunk.js', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'scoped-sample-app',
              'static',
              'js',
              '2.00d55a9b.chunk.js',
            ),
          ),
        ),
        {
          filepath: '2.00d55a9b.chunk.js',
        },
      ),
    ).toMatchSnapshot();
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

    await modular('build sample-app', {
      stdio: 'inherit',
    });
  });

  it('can add an app', () => {
    expect(tree(path.join(packagesPath, 'sample-app'))).toMatchInlineSnapshot(`
        "sample-app
        ├─ package.json
        ├─ public
        │  ├─ favicon.ico #6pu3rg
        │  ├─ index.html #1m6toxd
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

  it('can build an app', () => {
    expect(tree(path.join(modularRoot, 'dist', 'sample-app')))
      .toMatchInlineSnapshot(`
      "sample-app
      ├─ asset-manifest.json #q4rbpy
      ├─ favicon.ico #6pu3rg
      ├─ index.html #1emc0zn
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ robots.txt #1sjb8b3
      └─ static
         ├─ css
         │  ├─ main.a0f92c83.chunk.css #16n5nfq
         │  └─ main.a0f92c83.chunk.css.map #1l7oeeo
         └─ js
            ├─ 2.a4a07acc.chunk.js #1bx67oj
            ├─ 2.a4a07acc.chunk.js.LICENSE.txt #5bztxc
            ├─ 2.a4a07acc.chunk.js.map #11bh8rx
            ├─ main.a5660d78.chunk.js #3k720c
            ├─ main.a5660d78.chunk.js.map #13cp466
            ├─ runtime-main.c1e48d57.js #164st35
            └─ runtime-main.c1e48d57.js.map #1ood2zi"
    `);
  });

  it('can generate a asset-manifest', async () => {
    expect(
      String(
        await fs.readFile(
          path.join(modularRoot, 'dist', 'sample-app', 'asset-manifest.json'),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('can generate a manifest', async () => {
    expect(
      String(
        await fs.readFile(
          path.join(modularRoot, 'dist', 'sample-app', 'manifest.json'),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('can generate a index.html', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(modularRoot, 'dist', 'sample-app', 'index.html'),
          ),
        ),
        {
          filepath: 'index.html',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a js/main.a5660d78.chunk.js', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'sample-app',
              'static',
              'js',
              'main.a5660d78.chunk.js',
            ),
          ),
        ),
        {
          filepath: 'main.a5660d78.chunk.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a js/runtime-main.c1e48d57.js', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'sample-app',
              'static',
              'js',
              'runtime-main.c1e48d57.js',
            ),
          ),
        ),
        {
          filepath: 'runtime-main.c1e48d57.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a js/2.a4a07acc.chunk.js', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'sample-app',
              'static',
              'js',
              '2.a4a07acc.chunk.js',
            ),
          ),
        ),
        {
          filepath: '2.a4a07acc.chunk.js',
        },
      ),
    ).toMatchSnapshot();
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
