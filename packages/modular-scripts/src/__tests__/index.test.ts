import execa from 'execa';
import { exec } from 'child_process';
import { promisify } from 'util';
import _rimraf from 'rimraf';
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
import puppeteer from 'puppeteer';
import { ModularPackageJson } from '../utils/isModularType';

const rimraf = promisify(_rimraf);

const modularRoot = getModularRoot();

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

async function cleanup() {
  await rimraf(path.join(packagesPath, 'sample-view'));
  await rimraf(path.join(packagesPath, 'sample-package'));
  await rimraf(path.join(packagesPath, 'nested'));
  await rimraf(path.join(modularRoot, 'dist/sample-view'));
  await rimraf(path.join(modularRoot, 'dist/sample-package'));
  await rimraf(path.join(modularRoot, 'dist/nested'));
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
    await modular(
      'add sample-package --unstable-type package --unstable-name sample-package',
      {
        stdio: 'inherit',
      },
    );
    await modular(
      'add nested/sample-nested-package --unstable-type package --unstable-name @nested/sample-package',
      {
        stdio: 'inherit',
      },
    );

    await fs.copyFile(
      path.join(__dirname, 'TestView.test-tsx'),
      path.join(packagesPath, targetedView, 'src', 'index.tsx'),
    );

    await fs.writeFile(
      path.join(
        packagesPath,
        'sample-package',
        'src',
        '__tests__',
        'mock-util.tsx',
      ),
      `
    export default function() {
      console.log("Just a util");
    }`,
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

    it('can add a package', () => {
      expect(tree(path.join(packagesPath, 'sample-package')))
        .toMatchInlineSnapshot(`
        "sample-package
        ├─ README.md #1jv3l2q
        ├─ package.json
        └─ src
           ├─ __tests__
           │  ├─ index.test.ts #1qvvmz7
           │  └─ mock-util.tsx #rjzbd3
           └─ index.ts #1woe74n"
      `);
    });

    it('can add a nested package', () => {
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
      port = '4000';
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
          "main": "dist-cjs/index.js",
          "modular": Object {
            "type": "view",
          },
          "module": "dist-es/index.js",
          "name": "sample-view",
          "typings": "dist-types/index.d.ts",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN outputs the correct output cjs file', () => {
      expect(
        String(
          fs.readFileSync(
            path.join(
              modularRoot,
              'dist',
              'sample-view',
              'dist-cjs',
              'index.js',
            ),
          ),
        ),
      ).toMatchSnapshot();
    });

    it('THEN outputs the correct output cjs map file', () => {
      expect(
        fs.readJsonSync(
          path.join(
            modularRoot,
            'dist',
            'sample-view',
            'dist-cjs',
            'index.js.map',
          ),
        ),
      ).toMatchSnapshot();
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-view')))
        .toMatchInlineSnapshot(`
        "sample-view
        ├─ README.md #11adaka
        ├─ dist-cjs
        │  ├─ index.js #l140cq
        │  └─ index.js.map #b9qv26
        ├─ dist-es
        │  ├─ index.js #ru9c3p
        │  └─ index.js.map #171l8pf
        ├─ dist-types
        │  └─ index.d.ts #1vloh7q
        └─ package.json"
      `);
    });
  });

  it('can execute tests', async () => {
    const output = await modular(
      'test sample-package sample-view sample-nested-package --watchAll false',
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
      'PASS packages/sample-view/src/__tests__/index.test.tsx',
    );
    expect(cleanedOutput).toContain(
      'PASS packages/sample-package/src/__tests__/index.test.ts',
    );
    expect(cleanedOutput).toContain(
      'PASS packages/nested/sample-nested-package/src/__tests__/index.test.ts',
    );
  });

  describe('WHEN building with preserve modules', () => {
    beforeAll(async () => {
      // build a package too, but preserve modules
      await modular('build sample-package --preserve-modules', {
        stdio: 'inherit',
      });
    });

    it('THEN expects the correct output package.json', async () => {
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
          "typings": "dist-types/index.d.ts",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN expects the correct output directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-package')))
        .toMatchInlineSnapshot(`
        "sample-package
        ├─ README.md #1jv3l2q
        ├─ dist-cjs
        │  ├─ index.js #rq9uxe
        │  └─ index.js.map #ys8x0i
        ├─ dist-es
        │  ├─ index.js #1gjntzw
        │  └─ index.js.map #b17359
        ├─ dist-types
        │  └─ index.d.ts #f68aj
        └─ package.json"
      `);
    });

    it.each(['main', 'module', 'typings'])(
      'THEN validates the typings file exists: %s',
      async (key: keyof ModularPackageJson) => {
        const packageJson = (await fs.readJSON(
          path.join(modularRoot, 'dist', 'sample-package', 'package.json'),
        )) as ModularPackageJson;
        const value = packageJson[key] as string;
        expect(
          fs
            .statSync(path.join(modularRoot, 'dist', 'sample-package', value))
            .isFile(),
        ).toEqual(true);
      },
    );
  });

  describe('WHEN building without preserve modules', () => {
    beforeAll(async () => {
      // build the nested package
      await modular('build @nested/sample-package --preserve-modules false', {
        stdio: 'inherit',
      });
    });

    it('THEN creates the correct package.json output', async () => {
      expect(
        await fs.readJson(
          path.join(
            modularRoot,
            'dist',
            'nested-sample-package',
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
          "typings": "dist-types/index.d.ts",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN outputs the right directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'nested-sample-package')))
        .toMatchInlineSnapshot(`
        "nested-sample-package
        ├─ README.md #1jv3l2q
        ├─ dist-cjs
        │  ├─ nested-sample-package.cjs.js #kv2xzp
        │  └─ nested-sample-package.cjs.js.map #j26x67
        ├─ dist-es
        │  ├─ nested-sample-package.es.js #40jnpo
        │  └─ nested-sample-package.es.js.map #11g8lh9
        ├─ dist-types
        │  └─ index.d.ts #f68aj
        └─ package.json"
      `);
    });

    it.each(['main', 'module', 'typings'])(
      'THEN validates the typings file exists: %s',
      async (key: keyof ModularPackageJson) => {
        const packageJson = (await fs.readJSON(
          path.join(
            modularRoot,
            'dist',
            'nested-sample-package',
            'package.json',
          ),
        )) as ModularPackageJson;
        const value = packageJson[key] as string;
        expect(
          fs
            .statSync(
              path.join(modularRoot, 'dist', 'nested-sample-package', value),
            )
            .isFile(),
        ).toEqual(true);
      },
    );
  });
});
