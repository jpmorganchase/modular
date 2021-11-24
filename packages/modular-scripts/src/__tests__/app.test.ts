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

  rimraf.sync(path.join(packagesPath, 'node-env-app'));
  rimraf.sync(path.join(modularRoot, 'dist/node-env-app'));

  // run yarn so yarn.lock gets reset
  return execa.sync('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('when working with a NODE_ENV app', () => {
  beforeAll(async () => {
    await modular(
      'add node-env-app --unstable-type app --unstable-name node-env-app',
      { stdio: 'inherit' },
    );

    await fs.writeFile(
      path.join(modularRoot, 'packages', 'node-env-app', 'src', 'index.ts'),
      `
      console.log(process.env.NODE_ENV);

      export {};
    `,
    );

    await modular('build node-env-app', {
      stdio: 'inherit',
    });
  });

  it('can build a app', () => {
    expect(tree(path.join(modularRoot, 'dist', 'node-env-app')))
      .toMatchInlineSnapshot(`
      "node-env-app
      ├─ asset-manifest.json #n1rvuh
      ├─ favicon.ico #6pu3rg
      ├─ index.html #1yaenq4
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ robots.txt #1sjb8b3
      └─ static
         └─ js
            ├─ main.3db228f9.chunk.js #20y3tb
            ├─ main.3db228f9.chunk.js.map #131rxqt
            ├─ runtime-main.a0dc6a9b.js #o5bsr9
            └─ runtime-main.a0dc6a9b.js.map #10n4p35"
    `);
  });

  it('can generate a js/main.3db228f9.chunk.js', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'node-env-app',
              'static',
              'js',
              'main.3db228f9.chunk.js',
            ),
          ),
        ),
        {
          filepath: 'main.3db228f9.chunk.js',
        },
      ),
    ).toMatchSnapshot();
  });
});

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
      ├─ asset-manifest.json #fd251t
      ├─ favicon.ico #6pu3rg
      ├─ index.html #saweoy
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ robots.txt #1sjb8b3
      └─ static
         ├─ css
         │  ├─ main.a0f92c83.chunk.css #16n5nfq
         │  └─ main.a0f92c83.chunk.css.map #1l7oeeo
         └─ js
            ├─ 2.dd7fe2ee.chunk.js #1umsa1c
            ├─ 2.dd7fe2ee.chunk.js.LICENSE.txt #eplx8h
            ├─ 2.dd7fe2ee.chunk.js.map #f3ttow
            ├─ main.8b9be32b.chunk.js #jou2ln
            ├─ main.8b9be32b.chunk.js.map #q1dpnv
            ├─ runtime-main.c80b6939.js #tnzlop
            └─ runtime-main.c80b6939.js.map #14p9z3c"
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

  it('can generate a js/main.8b9be32b.chunk.js', async () => {
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
              'main.8b9be32b.chunk.js',
            ),
          ),
        ),
        {
          filepath: 'main.8b9be32b.chunk.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a js/runtime-main.c80b6939.js', async () => {
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
              'runtime-main.c80b6939.js',
            ),
          ),
        ),
        {
          filepath: 'runtime-main.c80b6939.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a js/2.dd7fe2ee.chunk.js', async () => {
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
              '2.dd7fe2ee.chunk.js',
            ),
          ),
        ),
        {
          filepath: '2.dd7fe2ee.chunk.js',
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
      ├─ asset-manifest.json #131f6kc
      ├─ favicon.ico #6pu3rg
      ├─ index.html #59u9a8
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ robots.txt #1sjb8b3
      └─ static
         ├─ css
         │  ├─ main.a0f92c83.chunk.css #16n5nfq
         │  └─ main.a0f92c83.chunk.css.map #1l7oeeo
         └─ js
            ├─ 2.42603bbe.chunk.js #1gybwlg
            ├─ 2.42603bbe.chunk.js.LICENSE.txt #eplx8h
            ├─ 2.42603bbe.chunk.js.map #164el3u
            ├─ main.8247c019.chunk.js #iwnokm
            ├─ main.8247c019.chunk.js.map #umebn0
            ├─ runtime-main.dc96e42d.js #1xc8leb
            └─ runtime-main.dc96e42d.js.map #xpqj11"
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

  it('can generate a js/main.8247c019.chunk.js', async () => {
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
              'main.8247c019.chunk.js',
            ),
          ),
        ),
        {
          filepath: 'main.8247c019.chunk.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a js/runtime-main.dc96e42d.js', async () => {
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
              'runtime-main.dc96e42d.js',
            ),
          ),
        ),
        {
          filepath: 'runtime-main.dc96e42d.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a js/2.42603bbe.chunk.js', async () => {
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
              '2.42603bbe.chunk.js',
            ),
          ),
        ),
        {
          filepath: '2.42603bbe.chunk.js',
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
