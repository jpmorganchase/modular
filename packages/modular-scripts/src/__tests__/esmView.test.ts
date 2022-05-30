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
import prettier from 'prettier';
import puppeteer from 'puppeteer';

import getModularRoot from '../utils/getModularRoot';
import { startApp, DevServer } from './start-app';
import type { CoreProperties } from '@schemastore/package';

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
  await rimraf(path.join(packagesPath, 'sample-esm-view'));
  await rimraf(path.join(modularRoot, 'dist/sample-esm-view'));
  // run yarn so yarn.lock gets reset
  await execa('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

const targetedView = 'sample-esm-view';

describe('modular-scripts', () => {
  beforeAll(async () => {
    await cleanup();
    await modular(
      'add sample-esm-view --unstable-type esm-view --unstable-name sample-esm-view',
      { stdio: 'inherit' },
    );

    await fs.copyFile(
      path.join(__dirname, 'TestEsmView.test-tsx'),
      path.join(packagesPath, targetedView, 'src', 'index.tsx'),
    );
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('Adds packages correctly', () => {
    it('can add a esm-view', () => {
      expect(tree(path.join(packagesPath, 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ package.json
        └─ src
           ├─ EsmView.css #x6onxt
           ├─ __tests__
           │  └─ EsmView.test.tsx #113p9x8
           ├─ index.tsx #plsqyc
           ├─ logo.svg #1okqmlj
           └─ react-app-env.d.ts #t4ygcy"
      `);
    });
  });

  describe('WHEN starting a esm-view', () => {
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
      devServer = await startApp(targetedView, {
        env: { PORT: port, USE_MODULAR_ESBUILD: 'true' },
      });
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

    it('THEN can start a esm-view', async () => {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${port}`, {});

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { getByTestId, findByTestId } = getQueriesForElement(
        await getDocument(page),
      );

      await findByTestId('test-this');

      // eslint-disable-next-line testing-library/no-await-sync-query
      expect(await getNodeText(await getByTestId('test-this'))).toBe(
        'this is a modular esm-view',
      );
    });
  });

  describe('WHEN building a esm-view', () => {
    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
        },
      });
    });

    it('THEN outputs the correct package.json in the dist directory', async () => {
      expect(
        await fs.readJson(
          path.join(modularRoot, 'dist', 'sample-esm-view', 'package.json'),
        ),
      ).toMatchInlineSnapshot(`
        Object {
          "bundledDependencies": Array [],
          "dependencies": Object {
            "react": "17.0.2",
          },
          "modular": Object {
            "type": "esm-view",
          },
          "module": "/static/js/index-7JXQF5H3.js",
          "name": "sample-esm-view",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ index.html #17sfbiz
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #14ismmk
              ├─ index-7JXQF5H3.js #1yztbh1
              └─ index-7JXQF5H3.js.map #qbs4qx"
      `);
    });
  });

  describe('WHEN building a esm-view with a custom ESM CDN', () => {
    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ index.html #17sfbiz
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #1ty1plt
              ├─ index-L37UKP56.js #qx2hs8
              └─ index-L37UKP56.js.map #qbs4qx"
      `);
    });

    it('THEN rewrites the dependencies according to the template string', async () => {
      const baseDir = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        'static',
        'js',
      );
      const trampolineFile = (
        await fs.readFile(path.join(baseDir, '_trampoline.js'))
      ).toString();

      const indexFile = (
        await fs.readFile(path.join(baseDir, 'index-L37UKP56.js'))
      ).toString();
      expect(
        prettier.format(indexFile, {
          filepath: 'index-F6YQ237K.js',
        }),
      ).toMatchSnapshot();
      expect(trampolineFile).toContain(`https://mycustomcdn.net/react@1`);
      expect(trampolineFile).toContain(`https://mycustomcdn.net/react-dom@1`);
      expect(indexFile).toContain(`https://mycustomcdn.net/react@1`);
    });
  });

  describe('WHEN building a esm-view with various kinds of package dependencies with esbuild', () => {
    beforeAll(async () => {
      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(packagesPath, targetedView, 'src', 'index.tsx'),
      );

      const packageJsonPath = path.join(
        packagesPath,
        targetedView,
        'package.json',
      );
      const packageJson = (await fs.readJSON(
        packageJsonPath,
      )) as CoreProperties;

      await fs.writeJSON(
        packageJsonPath,
        Object.assign(packageJson, {
          dependencies: {
            lodash: '^4.17.21',
            'lodash.merge': '^4.6.2',
            'regular-table': '^0.5.6',
          },
        }),
      );

      await execa('yarnpkg', [], {
        cwd: modularRoot,
        cleanup: true,
      });

      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ index.html #17sfbiz
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #1wxf8ip
              ├─ index-CWZPL7BC.js #imt5bw
              └─ index-CWZPL7BC.js.map #agat27"
      `);
    });

    it('THEN rewrites the dependencies', async () => {
      const baseDir = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        'static',
        'js',
      );

      const indexFile = (
        await fs.readFile(path.join(baseDir, 'index-CWZPL7BC.js'))
      ).toString();
      expect(
        prettier.format(indexFile, {
          filepath: 'index-F6YQ237K.js',
        }),
      ).toMatchSnapshot();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@1`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@^4.17.21`);
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2`,
      );
    });
  });

  describe('WHEN building a esm-view with various kinds of package dependencies with webpack', () => {
    beforeAll(async () => {
      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(packagesPath, targetedView, 'src', 'index.tsx'),
      );

      const packageJsonPath = path.join(
        packagesPath,
        targetedView,
        'package.json',
      );
      const packageJson = (await fs.readJSON(
        packageJsonPath,
      )) as CoreProperties;

      await fs.writeJSON(
        packageJsonPath,
        Object.assign(packageJson, {
          dependencies: {
            lodash: '^4.17.21',
            'lodash.merge': '^4.6.2',
            'regular-table': '^0.5.6',
          },
        }),
      );

      await execa('yarnpkg', [], {
        cwd: modularRoot,
        cleanup: true,
      });

      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ asset-manifest.json #1nofqb7
        ├─ index.html #17sfbiz
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #1r6l45w
              ├─ main.641dd395.js #1xbi3kt
              └─ main.641dd395.js.map #iff2zu"
      `);
    });

    it('THEN rewrites the dependencies', async () => {
      const baseDir = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        'static',
        'js',
      );

      const indexFile = (
        await fs.readFile(path.join(baseDir, 'main.641dd395.js'))
      ).toString();
      expect(
        prettier.format(indexFile, {
          filepath: 'index-F6YQ237K.js',
        }),
      ).toMatchSnapshot();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@1`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@^4.17.21`);
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2`,
      );
    });
  });

  describe('WHEN building a esm-view with resolutions', () => {
    beforeAll(async () => {
      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(packagesPath, targetedView, 'src', 'index.tsx'),
      );

      const packageJsonPath = path.join(
        packagesPath,
        targetedView,
        'package.json',
      );
      const packageJson = (await fs.readJSON(
        packageJsonPath,
      )) as CoreProperties;

      await fs.writeJSON(
        packageJsonPath,
        Object.assign(packageJson, {
          dependencies: {
            lodash: '^4.17.21',
            'lodash.merge': '^4.6.2',
            'regular-table': '^0.5.6',
          },
        }),
      );

      await execa('yarnpkg', [], {
        cwd: modularRoot,
        cleanup: true,
      });

      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[resolution]',
        },
      });
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ index.html #17sfbiz
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #uiztvx
              ├─ index-REREBP7K.js #1tmiw85
              └─ index-REREBP7K.js.map #sk95di"
      `);
    });

    it('THEN rewrites the dependencies', async () => {
      const baseDir = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        'static',
        'js',
      );

      const indexFile = (
        await fs.readFile(path.join(baseDir, 'index-REREBP7K.js'))
      ).toString();
      expect(
        prettier.format(indexFile, {
          filepath: 'index-F6YQ237K.js',
        }),
      ).toMatchSnapshot();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@1`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@4`);
    });
  });

  describe('WHEN building a esm-view with resolutions and webpack', () => {
    beforeAll(async () => {
      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(packagesPath, targetedView, 'src', 'index.tsx'),
      );

      const packageJsonPath = path.join(
        packagesPath,
        targetedView,
        'package.json',
      );
      const packageJson = (await fs.readJSON(
        packageJsonPath,
      )) as CoreProperties;

      await fs.writeJSON(
        packageJsonPath,
        Object.assign(packageJson, {
          dependencies: {
            lodash: '^4.17.21',
            'lodash.merge': '^4.6.2',
            'regular-table': '^0.5.6',
          },
        }),
      );

      await execa('yarnpkg', [], {
        cwd: modularRoot,
        cleanup: true,
      });

      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[resolution]',
        },
      });
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ asset-manifest.json #11wu34r
        ├─ index.html #17sfbiz
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #b3kerw
              ├─ main.2ed560c9.js #m26j81
              └─ main.2ed560c9.js.map #v28o2j"
      `);
    });

    it('THEN rewrites the dependencies', async () => {
      const baseDir = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        'static',
        'js',
      );

      const indexFile = (
        await fs.readFile(path.join(baseDir, 'main.2ed560c9.js'))
      ).toString();
      expect(
        prettier.format(indexFile, {
          filepath: 'index-F6YQ237K.js',
        }),
      ).toMatchSnapshot();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@1`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@4`);
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten', () => {
    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_BLOCK_LIST: 'lodash,lodash.merge',
        },
      });
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ index.html #17sfbiz
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #17ucrp2
              ├─ index-XEPSSNSR.js #18as3s5
              └─ index-XEPSSNSR.js.map #3rxdut"
      `);
    });

    it('THEN rewrites only the dependencies that are not specified in the blocklist', async () => {
      const baseDir = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        'static',
        'js',
      );

      const indexFile = (
        await fs.readFile(path.join(baseDir, 'index-XEPSSNSR.js'))
      ).toString();
      expect(
        prettier.format(indexFile, {
          filepath: 'index-F6YQ237K.js',
        }),
      ).toMatchSnapshot();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash.merge@`);
    });

    it('THEN expects the correct bundledDependencies in package.json', async () => {
      expect(
        (
          (await fs.readJson(
            path.join(modularRoot, 'dist', 'sample-esm-view', 'package.json'),
          )) as CoreProperties
        ).bundledDependencies,
      ).toEqual(['lodash', 'lodash.merge']);
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten using wildcards', () => {
    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_BLOCK_LIST: 'lodash*',
        },
      });
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ index.html #17sfbiz
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #17ucrp2
              ├─ index-XEPSSNSR.js #18as3s5
              └─ index-XEPSSNSR.js.map #3rxdut"
      `);
    });

    it('THEN rewrites only the dependencies that are not specified in the blocklist', async () => {
      const baseDir = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        'static',
        'js',
      );

      const indexFile = (
        await fs.readFile(path.join(baseDir, 'index-XEPSSNSR.js'))
      ).toString();
      expect(
        prettier.format(indexFile, {
          filepath: 'index-F6YQ237K.js',
        }),
      ).toMatchSnapshot();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash.merge@`);
    });

    it('THEN expects the correct bundledDependencies in package.json', async () => {
      expect(
        (
          (await fs.readJson(
            path.join(modularRoot, 'dist', 'sample-esm-view', 'package.json'),
          )) as CoreProperties
        ).bundledDependencies,
      ).toEqual(['lodash', 'lodash.merge']);
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten using allow list and wildcards', () => {
    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_ALLOW_LIST: 'react*',
        },
      });
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ index.html #i5rgnz
        ├─ package.json
        └─ static
           ├─ css
           │  ├─ index-EF6KSY3N.css #1dws3j4
           │  └─ index-EF6KSY3N.css.map #1ipj0y2
           └─ js
              ├─ _trampoline.js #1xwy35p
              ├─ index-LIUI66J3.js #3c96f6
              └─ index-LIUI66J3.js.map #h3w4jy"
      `);
    });

    it('THEN rewrites only the dependencies that are not specified in the blocklist', async () => {
      const baseDir = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        'static',
        'js',
      );

      const indexFile = (
        await fs.readFile(path.join(baseDir, 'index-LIUI66J3.js'))
      ).toString();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash.merge@`);
    });

    it('THEN expects the correct bundledDependencies in package.json', async () => {
      expect(
        (
          (await fs.readJson(
            path.join(modularRoot, 'dist', 'sample-esm-view', 'package.json'),
          )) as CoreProperties
        ).bundledDependencies,
      ).toEqual(['lodash', 'lodash.merge', 'regular-table']);
    });
  });

  describe('WHEN building a esm-view specifying a PUBLIC_URL', () => {
    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          PUBLIC_URL: '/public/path/',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ index.html #1cwcz61
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #1wxf8ip
              ├─ index-CWZPL7BC.js #1vkjn5c
              └─ index-CWZPL7BC.js.map #agat27"
      `);
    });

    it('THEN expects the correct source in package.json', async () => {
      expect(
        (
          (await fs.readJson(
            path.join(modularRoot, 'dist', 'sample-esm-view', 'package.json'),
          )) as CoreProperties
        ).module,
      ).toEqual('/public/path/static/js/index-CWZPL7BC.js');
    });
  });

  describe('WHEN building a esm-view specifying a PUBLIC_URL and the path is ./', () => {
    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          PUBLIC_URL: './',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-esm-view')))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ index.html #1eo5g4s
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #1wxf8ip
              ├─ index-CWZPL7BC.js #1phjm7s
              └─ index-CWZPL7BC.js.map #agat27"
      `);
    });

    it('THEN expects the correct source in package.json', async () => {
      expect(
        (
          (await fs.readJson(
            path.join(modularRoot, 'dist', 'sample-esm-view', 'package.json'),
          )) as CoreProperties
        ).module,
      ).toEqual('./static/js/index-CWZPL7BC.js');
    });
  });
});
