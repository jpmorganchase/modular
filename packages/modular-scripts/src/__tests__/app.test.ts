/**
 * @jest-environment jsdom
 */
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
import type { CoreProperties } from '@schemastore/package';
import { runYarnModular, runModularForTests } from '../test/utils';

// eslint-disable-next-line @typescript-eslint/unbound-method
const { getNodeText } = queries;

const modularRoot = getModularRoot();

// These tests must be executed sequentially with `--runInBand`.

const packagesPath = path.join(getModularRoot(), 'packages');

function cleanup() {
  rimraf.sync(path.join(packagesPath, 'node-env-app'));
  rimraf.sync(path.join(modularRoot, 'dist/node-env-app'));

  rimraf.sync(path.join(packagesPath, 'sample-app'));
  rimraf.sync(path.join(modularRoot, 'dist/sample-app'));

  rimraf.sync(path.join(packagesPath, 'scoped'));
  rimraf.sync(path.join(modularRoot, 'dist/scoped-sample-app'));

  rimraf.sync(path.join(packagesPath, 'custom'));
  rimraf.sync(path.join(modularRoot, 'dist/scoped-custom-app'));

  // run yarn so yarn.lock gets reset
  return execa.sync('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('when working with a NODE_ENV app', () => {
  beforeAll(async () => {
    runModularForTests(modularRoot, 'add node-env-app --unstable-type app');

    await fs.writeFile(
      path.join(modularRoot, 'packages', 'node-env-app', 'src', 'index.ts'),
      `
      console.log(process.env.NODE_ENV);

      export {};
    `,
    );

    runModularForTests(modularRoot, 'build node-env-app');
  });

  afterAll(cleanup);

  it('can build a app', () => {
    expect(tree(path.join(modularRoot, 'dist', 'node-env-app')))
      .toMatchInlineSnapshot(`
      "node-env-app
      ├─ asset-manifest.json #5npfrr
      ├─ favicon.ico #6pu3rg
      ├─ index.html #9j6678
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ package.json
      ├─ robots.txt #1sjb8b3
      └─ static
         └─ js
            ├─ main.a482480b.js #1xwb1v
            ├─ main.a482480b.js.map #wh4kdy
            ├─ runtime-main.97707f9d.js #15lezt9
            └─ runtime-main.97707f9d.js.map #1qz5n9i"
    `);
  });

  it('can generate a hashed js chunk in the js directory', async () => {
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
              'main.a482480b.js',
            ),
          ),
        ),
        {
          filepath: 'main.a482480b.js',
        },
      ),
    ).toMatchSnapshot();
  });
});

describe('When working with a npm scoped app', () => {
  beforeAll(() => {
    runModularForTests(
      modularRoot,
      'add @scoped/sample-app --unstable-type app',
    );
    runModularForTests(modularRoot, 'build @scoped/sample-app');
  });

  afterAll(cleanup);

  it('can build a npm scoped app', () => {
    expect(tree(path.join(modularRoot, 'dist', 'scoped-sample-app')))
      .toMatchInlineSnapshot(`
      "scoped-sample-app
      ├─ asset-manifest.json #sfq5q
      ├─ favicon.ico #6pu3rg
      ├─ index.html #5mlazw
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ package.json
      ├─ robots.txt #1sjb8b3
      └─ static
         ├─ css
         │  ├─ main.1a7488ce.css #x701i6
         │  └─ main.1a7488ce.css.map #z36y5v
         ├─ js
         │  ├─ 691.024b78a1.js #3p6i9s
         │  ├─ 691.024b78a1.js.LICENSE.txt #eplx8h
         │  ├─ 691.024b78a1.js.map #1k1dfv5
         │  ├─ main.59a925f1.js #lnwzbz
         │  ├─ main.59a925f1.js.map #ue8mz1
         │  ├─ runtime-main.de012fdc.js #1qz643h
         │  └─ runtime-main.de012fdc.js.map #v3az36
         └─ media
            └─ logo.103b5fa18196d5665a7e12318285c916.svg #1okqmlj"
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

  it('can generate a hashed main css chunk in the css directory', async () => {
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
              'main.1a7488ce.css',
            ),
          ),
        ),
        {
          filepath: 'main.1a7488ce.css',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a hashed css map in the css directory', async () => {
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
              'main.1a7488ce.css.map',
            ),
          ),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('can generate a hashed main js chunk in the js directory', async () => {
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
              'main.59a925f1.js',
            ),
          ),
        ),
        {
          filepath: 'main.59a925f1.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a hashed runtime chunk in the js directory', async () => {
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
              'runtime-main.de012fdc.js',
            ),
          ),
        ),
        {
          filepath: 'runtime-main.de012fdc.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a hashed vendor chunk in the js directory', async () => {
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
              '691.024b78a1.js',
            ),
          ),
        ),
        {
          filepath: '691.024b78a1.js',
        },
      ),
    ).toMatchSnapshot();
  });
});

describe('when working with a non-scoped app', () => {
  beforeAll(async () => {
    runModularForTests(modularRoot, 'add sample-app --unstable-type app');

    // Let's replace the App module with something of our own
    // with a test specific element we can introspect
    await fs.copyFile(
      path.join(__dirname, 'TestApp.test-tsx'),
      path.join(packagesPath, 'sample-app', 'src', 'App.tsx'),
    );

    runModularForTests(modularRoot, 'build sample-app');
  });

  afterAll(cleanup);

  it('can add an app', () => {
    expect(tree(path.join(packagesPath, 'sample-app'))).toMatchInlineSnapshot(`
      "sample-app
      ├─ README.md #1wz039g
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
      │  │  └─ App.test.tsx #1u72nad
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
      ├─ asset-manifest.json #m15pac
      ├─ favicon.ico #6pu3rg
      ├─ index.html #1v77ixd
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ package.json
      ├─ robots.txt #1sjb8b3
      └─ static
         ├─ css
         │  ├─ main.1a7488ce.css #x701i6
         │  └─ main.1a7488ce.css.map #z36y5v
         ├─ js
         │  ├─ 691.27c15ff7.js #z635hj
         │  ├─ 691.27c15ff7.js.LICENSE.txt #eplx8h
         │  ├─ 691.27c15ff7.js.map #r5j0b0
         │  ├─ main.46370e66.js #1vnj4tr
         │  ├─ main.46370e66.js.map #193ww1g
         │  ├─ runtime-main.e92969dd.js #1is98ey
         │  └─ runtime-main.e92969dd.js.map #xx7n2r
         └─ media
            └─ logo.103b5fa18196d5665a7e12318285c916.svg #1okqmlj"
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

  it('can generate a package.json', async () => {
    const packageJson = JSON.parse(
      String(
        await fs.readFile(
          path.join(modularRoot, 'dist', 'sample-app', 'package.json'),
        ),
      ),
    ) as CoreProperties;

    expect(packageJson.name).toBe('sample-app');
    expect(packageJson.version).toBe('1.0.0');
    expect(packageJson.modular).toStrictEqual({ type: 'app' });
    expect(packageJson.dependencies?.react).toBeTruthy();
    expect(packageJson.dependencies?.['react-dom']).toBeTruthy();
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

  it('can generate a hashed main js chunk in the js directory', async () => {
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
              'main.46370e66.js',
            ),
          ),
        ),
        {
          filepath: 'main.46370e66.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a hashed runtime chunk in the js directory', async () => {
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
              'runtime-main.e92969dd.js',
            ),
          ),
        ),
        {
          filepath: 'runtime-main.e92969dd.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a hashed vendor chunk in the js directory', async () => {
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
              '691.27c15ff7.js',
            ),
          ),
        ),
        {
          filepath: '691.27c15ff7.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can execute tests', async () => {
    const output = await runYarnModular(
      getModularRoot(),
      'test sample-app --watchAll false',
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
        void devServer.kill();
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

describe('When working with an app added in a custom directory', () => {
  beforeAll(() => {
    runModularForTests(
      modularRoot,
      'add @scoped/custom-app --unstable-type app --path packages/custom/scoped/',
    );
    runModularForTests(modularRoot, 'build @scoped/custom-app');
  });

  afterAll(cleanup);

  it('can build a scoped app from a custom directory', () => {
    expect(tree(path.join(modularRoot, 'dist', 'scoped-custom-app')))
      .toMatchInlineSnapshot(`
      "scoped-custom-app
      ├─ asset-manifest.json #w24273
      ├─ favicon.ico #6pu3rg
      ├─ index.html #rv8ndx
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ package.json
      ├─ robots.txt #1sjb8b3
      └─ static
         ├─ css
         │  ├─ main.1a7488ce.css #x701i6
         │  └─ main.1a7488ce.css.map #z36y5v
         ├─ js
         │  ├─ 747.4db12b23.js #1rzkpt3
         │  ├─ 747.4db12b23.js.LICENSE.txt #eplx8h
         │  ├─ 747.4db12b23.js.map #1mu4m1j
         │  ├─ main.1d49254f.js #sfgkyb
         │  ├─ main.1d49254f.js.map #1okwr8l
         │  ├─ runtime-main.cef70e6c.js #1f77948
         │  └─ runtime-main.cef70e6c.js.map #6vl4pa
         └─ media
            └─ logo.103b5fa18196d5665a7e12318285c916.svg #1okqmlj"
    `);
  });

  it('can generate a asset-manifest', async () => {
    expect(
      String(
        await fs.readFile(
          path.join(
            modularRoot,
            'dist',
            'scoped-custom-app',
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
          path.join(modularRoot, 'dist', 'scoped-custom-app', 'manifest.json'),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('can generate a index.html', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(modularRoot, 'dist', 'scoped-custom-app', 'index.html'),
          ),
        ),
        {
          filepath: 'index.html',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a hashed main css chunk in the css directory', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'scoped-custom-app',
              'static',
              'css',
              'main.1a7488ce.css',
            ),
          ),
        ),
        {
          filepath: 'main.1a7488ce.css',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a hashed css map in the css directory', async () => {
    expect(
      JSON.parse(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'scoped-custom-app',
              'static',
              'css',
              'main.1a7488ce.css.map',
            ),
          ),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('can generate a hashed main js chunk in the js directory', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'scoped-custom-app',
              'static',
              'js',
              'main.1d49254f.js',
            ),
          ),
        ),
        {
          filepath: 'main.1d49254f.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a hashed runtime chunk in the js directory', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'scoped-custom-app',
              'static',
              'js',
              'runtime-main.cef70e6c.js',
            ),
          ),
        ),
        {
          filepath: 'runtime-main.cef70e6c.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a hashed vendor chunk in the js directory', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              modularRoot,
              'dist',
              'scoped-custom-app',
              'static',
              'js',
              '747.4db12b23.js',
            ),
          ),
        ),
        {
          filepath: '747.4db12b23.js',
        },
      ),
    ).toMatchSnapshot();
  });
});
