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
import puppeteer from 'puppeteer';

import getModularRoot from '../utils/getModularRoot';
import { startApp, DevServer } from './start-app';

import type { ModularPackageJson } from '@modular-scripts/modular-types';

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

    await modular('add sample-view --unstable-type view', { stdio: 'inherit' });
    await modular('add sample-package --unstable-type package', {
      stdio: 'inherit',
    });
    await modular(
      'add @nested/sample-package --unstable-type package --path packages/nested',
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
        ├─ package.json
        └─ src
           ├─ __tests__
           │  └─ index.test.tsx #1ul24q9
           └─ index.tsx #19kersg"
      `);
    });

    it('can add a package', () => {
      expect(tree(path.join(packagesPath, 'sample-package')))
        .toMatchInlineSnapshot(`
        "sample-package
        ├─ package.json
        └─ src
           ├─ __tests__
           │  ├─ index.test.ts #1t39yxy
           │  └─ mock-util.tsx #rjzbd3
           └─ index.ts #1woe74n"
      `);
    });

    it('can add a nested package', () => {
      expect(tree(path.join(packagesPath, 'nested/sample-package')))
        .toMatchInlineSnapshot(`
        "sample-package
        ├─ package.json
        └─ src
           ├─ __tests__
           │  └─ index.test.ts #1t39yxy
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
        void devServer.kill();
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
        {
          "dependencies": {
            "react": "17.0.2",
          },
          "files": [
            "dist-cjs",
            "dist-es",
            "dist-types",
            "README.md",
          ],
          "main": "dist-cjs/index.js",
          "modular": {
            "type": "view",
          },
          "module": "dist-es/index.js",
          "name": "sample-view",
          "private": false,
          "repository": {
            "directory": "packages/sample-view",
            "type": "git",
            "url": "https://github.com/jpmorganchase/modular.git",
          },
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

    it('THEN outputs the correct output cjs index2.js file', () => {
      expect(
        String(
          fs.readFileSync(
            path.join(
              modularRoot,
              'dist',
              'sample-view',
              'dist-cjs',
              'index2.js',
            ),
          ),
        ),
      ).toMatchSnapshot();
    });

    it('THEN outputs the correct output cjs  index2.js map file', () => {
      expect(
        fs.readJsonSync(
          path.join(
            modularRoot,
            'dist',
            'sample-view',
            'dist-cjs',
            'index2.js.map',
          ),
        ),
      ).toMatchSnapshot();
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-view')))
        .toMatchInlineSnapshot(`
        "sample-view
        ├─ dist-cjs
        │  ├─ index.js #p1m6x9
        │  ├─ index.js.map #16jes1h
        │  ├─ index2.js #dbk75e
        │  └─ index2.js.map #1mldv0
        ├─ dist-es
        │  ├─ index.js #tcl83f
        │  ├─ index.js.map #yz1h1d
        │  ├─ index2.js #urz4k4
        │  └─ index2.js.map #1p2gdzx
        ├─ dist-types
        │  └─ index.d.ts #obuyms
        └─ package.json"
      `);
    });
  });

  it('can execute tests', async () => {
    const output = await modular(
      'test sample-package sample-view @nested/sample-package --watchAll false',
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
    expect(cleanedOutput).toContain(
      'PASS test packages/sample-package/src/__tests__/index.test.ts',
    );
    expect(cleanedOutput).toContain(
      'PASS test packages/nested/sample-package/src/__tests__/index.test.ts',
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
        {
          "dependencies": {},
          "files": [
            "dist-cjs",
            "dist-es",
            "dist-types",
            "README.md",
          ],
          "main": "dist-cjs/index.js",
          "modular": {
            "type": "package",
          },
          "module": "dist-es/index.js",
          "name": "sample-package",
          "private": false,
          "repository": {
            "directory": "packages/sample-package",
            "type": "git",
            "url": "https://github.com/jpmorganchase/modular.git",
          },
          "typings": "dist-types/index.d.ts",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN expects the correct output directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-package')))
        .toMatchInlineSnapshot(`
        "sample-package
        ├─ dist-cjs
        │  ├─ index.js #p1m6x9
        │  ├─ index.js.map #16jes1h
        │  ├─ index2.js #6y6kyx
        │  └─ index2.js.map #14fansi
        ├─ dist-es
        │  ├─ index.js #tcl83f
        │  ├─ index.js.map #yz1h1d
        │  ├─ index2.js #hx36fq
        │  └─ index2.js.map #1s1miqv
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
        ).toBe(true);
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
        {
          "dependencies": {},
          "files": [
            "dist-cjs",
            "dist-es",
            "dist-types",
            "README.md",
          ],
          "main": "dist-cjs/nested-sample-package.cjs.js",
          "modular": {
            "type": "package",
          },
          "module": "dist-es/nested-sample-package.es.js",
          "name": "@nested/sample-package",
          "private": false,
          "repository": {
            "directory": "packages/nested/sample-package",
            "type": "git",
            "url": "https://github.com/jpmorganchase/modular.git",
          },
          "typings": "dist-types/index.d.ts",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN outputs the right directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'nested-sample-package')))
        .toMatchInlineSnapshot(`
        "nested-sample-package
        ├─ dist-cjs
        │  ├─ nested-sample-package.cjs.js #kv2xzp
        │  └─ nested-sample-package.cjs.js.map #1vw1uze
        ├─ dist-es
        │  ├─ nested-sample-package.es.js #11z6hlv
        │  └─ nested-sample-package.es.js.map #1nblmnq
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
        ).toBe(true);
      },
    );
  });
});
