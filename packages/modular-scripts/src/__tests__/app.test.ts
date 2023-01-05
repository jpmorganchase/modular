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
import { runModularStreamlined } from '../test/utils';

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
    await runModularStreamlined(
      modularRoot,
      'add node-env-app --unstable-type app',
    );

    await fs.writeFile(
      path.join(modularRoot, 'packages', 'node-env-app', 'src', 'index.ts'),
      `
      console.log(process.env.NODE_ENV);

      export {};
    `,
    );

    await runModularStreamlined(modularRoot, 'build node-env-app', {
      stdio: 'inherit',
    });
  });

  afterAll(cleanup);

  it('can build a app', () => {
    expect(tree(path.join(modularRoot, 'dist', 'node-env-app')))
      .toMatchInlineSnapshot(`
      "node-env-app
      ├─ asset-manifest.json #1tslp45
      ├─ favicon.ico #6pu3rg
      ├─ index.html #1mo9b1m
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ package.json
      ├─ robots.txt #1sjb8b3
      └─ static
         └─ js
            ├─ main.ed06689d.js #fhv6bj
            ├─ main.ed06689d.js.map #7m5pab
            ├─ runtime-main.61e0d312.js #13gmjdw
            └─ runtime-main.61e0d312.js.map #17efux7"
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
  beforeAll(async () => {
    await runModularStreamlined(
      modularRoot,
      'add @scoped/sample-app --unstable-type app',
      {
        stdio: 'inherit',
      },
    );

    await runModularStreamlined(modularRoot, 'build @scoped/sample-app', {
      stdio: 'inherit',
    });
  });

  afterAll(cleanup);

  it('can build a npm scoped app', () => {
    expect(tree(path.join(modularRoot, 'dist', 'scoped-sample-app')))
      .toMatchInlineSnapshot(`
      "scoped-sample-app
      ├─ asset-manifest.json #1sd81fg
      ├─ favicon.ico #6pu3rg
      ├─ index.html #1mleewn
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
         │  ├─ main.cc95cb0d.js #5xzsed
         │  ├─ main.cc95cb0d.js.map #yi4ha0
         │  ├─ runtime-main.a4aef198.js #vm1sz0
         │  ├─ runtime-main.a4aef198.js.map #1ua5e77
         │  ├─ vendors-node_modules_react-dom_index_js.7d6c922e.js #jcr907
         │  ├─ vendors-node_modules_react-dom_index_js.7d6c922e.js.LICENSE.txt #eplx8h
         │  └─ vendors-node_modules_react-dom_index_js.7d6c922e.js.map #plqwlj
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
              'main.b44531b6.js',
            ),
          ),
        ),
        {
          filepath: 'main.b44531b6.js',
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
              '316.74c894ba.js',
            ),
          ),
        ),
        {
          filepath: '316.74c894ba.js',
        },
      ),
    ).toMatchSnapshot();
  });
});

describe('when working with a non-scoped app', () => {
  beforeAll(async () => {
    await runModularStreamlined(
      modularRoot,
      'add sample-app --unstable-type app',
      { stdio: 'inherit' },
    );

    // Let's replace the App module with something of our own
    // with a test specific element we can introspect
    await fs.copyFile(
      path.join(__dirname, 'TestApp.test-tsx'),
      path.join(packagesPath, 'sample-app', 'src', 'App.tsx'),
    );

    await runModularStreamlined(modularRoot, 'build sample-app', {
      stdio: 'inherit',
    });
  });

  afterAll(cleanup);

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
      ├─ asset-manifest.json #7r5st4
      ├─ favicon.ico #6pu3rg
      ├─ index.html #1bd3aum
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
         │  ├─ main.e98a5e0b.js #1yv2cos
         │  ├─ main.e98a5e0b.js.map #1595vk6
         │  ├─ runtime-main.7afcf58a.js #837t3b
         │  ├─ runtime-main.7afcf58a.js.map #1k6j0t9
         │  ├─ vendors-node_modules_react-dom_index_js.75b11de0.js #4pg52k
         │  ├─ vendors-node_modules_react-dom_index_js.75b11de0.js.LICENSE.txt #eplx8h
         │  └─ vendors-node_modules_react-dom_index_js.75b11de0.js.map #7hbdk7
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
              'main.abe6afa1.js',
            ),
          ),
        ),
        {
          filepath: 'main.abe6afa1.js',
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
              '316.394ef80b.js',
            ),
          ),
        ),
        {
          filepath: '316.394ef80b.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can execute tests', async () => {
    const output = await runModularStreamlined(
      modularRoot,
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
  beforeAll(async () => {
    await runModularStreamlined(
      modularRoot,
      'add @scoped/custom-app --unstable-type app --path packages/custom/scoped/',
      {
        stdio: 'inherit',
      },
    );

    await runModularStreamlined(modularRoot, 'build @scoped/custom-app', {
      stdio: 'inherit',
    });
  });

  afterAll(cleanup);

  it('can build a scoped app from a custom directory', () => {
    expect(tree(path.join(modularRoot, 'dist', 'scoped-custom-app')))
      .toMatchInlineSnapshot(`
      "scoped-custom-app
      ├─ asset-manifest.json #1ee2t53
      ├─ favicon.ico #6pu3rg
      ├─ index.html #12svhi5
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
         │  ├─ main.78f42426.js #8769pb
         │  ├─ main.78f42426.js.map #1z01jlk
         │  ├─ runtime-main.7e043d2a.js #14joi1z
         │  ├─ runtime-main.7e043d2a.js.map #177xfe7
         │  ├─ vendors-node_modules_react-dom_index_js.9229d296.js #1llst3d
         │  ├─ vendors-node_modules_react-dom_index_js.9229d296.js.LICENSE.txt #eplx8h
         │  └─ vendors-node_modules_react-dom_index_js.9229d296.js.map #1eledvn
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
              'main.fba21b67.js',
            ),
          ),
        ),
        {
          filepath: 'main.fba21b67.js',
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
              '350.44eb2511.js',
            ),
          ),
        ),
        {
          filepath: '350.44eb2511.js',
        },
      ),
    ).toMatchSnapshot();
  });
});
