/**
 * @jest-environment jsdom
 */
import { exec } from 'child_process';
import path from 'path';
import execa from 'execa';
import rimraf from 'rimraf';
import tree from 'tree-view-for-tests';
import fs from 'fs-extra';
import prettier from 'prettier';
import {
  getDocument,
  getQueriesForElement,
  queries,
} from 'pptr-testing-library';
import puppeteer from 'puppeteer';
import getModularRoot from '../utils/getModularRoot';
import { DevServer, startApp } from './start-app';
import { runModularForTests, runYarnModular } from '../test/utils';
import type { CoreProperties } from '@schemastore/package';

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
      ├─ asset-manifest.json #1uspk39
      ├─ favicon.ico #6pu3rg
      ├─ index.html #ysfmfn
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
         │  ├─ 316.74c894ba.js #euj72k
         │  ├─ 316.74c894ba.js.LICENSE.txt #eplx8h
         │  ├─ 316.74c894ba.js.map #3k9wqz
         │  ├─ main.b44531b6.js #16ahtqz
         │  ├─ main.b44531b6.js.map #10tofk7
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
      │  ├─ index.tsx #18e4z12
      │  ├─ logo.svg #1okqmlj
      │  └─ react-app-env.d.ts #t4ygcy
      └─ tsconfig.json #6rw46b"
    `);
  });

  it('can build an app', () => {
    expect(tree(path.join(modularRoot, 'dist', 'sample-app')))
      .toMatchInlineSnapshot(`
      "sample-app
      ├─ asset-manifest.json #620pei
      ├─ favicon.ico #6pu3rg
      ├─ index.html #1vp7lky
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
         │  ├─ 316.394ef80b.js #1mv4xg9
         │  ├─ 316.394ef80b.js.LICENSE.txt #eplx8h
         │  ├─ 316.394ef80b.js.map #o90ydx
         │  ├─ main.abe6afa1.js #t9np46
         │  ├─ main.abe6afa1.js.map #19l0z09
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
      ├─ asset-manifest.json #dvvkwh
      ├─ favicon.ico #6pu3rg
      ├─ index.html #6iz8a6
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
         │  ├─ 350.44eb2511.js #4ubhrm
         │  ├─ 350.44eb2511.js.LICENSE.txt #eplx8h
         │  ├─ 350.44eb2511.js.map #1yro3n5
         │  ├─ main.fba21b67.js #16haxht
         │  ├─ main.fba21b67.js.map #bpgpf7
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
