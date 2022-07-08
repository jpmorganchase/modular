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
        exec(`yarnpkg kill-port ${port}`, (err) => {
          if (err) {
            console.log('err: ', err);
          }
          console.log(`Cleaned up processes on port ${port}`);
        });
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
    let outputManifest: CoreProperties;
    let outputJsEntrypoint: string;

    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
        },
      });
      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputManifest = manifestInfo.manifest;
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
    });

    it('THEN outputs the correct package.json in the dist directory', () => {
      const { module: _, ...manifest } = outputManifest;
      // Omit module from manifest as we test it separately, in a more informative way
      expect(manifest).toMatchInlineSnapshot(`
        Object {
          "bundledDependencies": Array [],
          "dependencies": Object {
            "react": "17.0.2",
          },
          "modular": Object {
            "type": "esm-view",
          },
          "name": "sample-esm-view",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN outputs the correct directory structure', () => {
      const entrypointJsMapPath = `${outputJsEntrypoint}.map`;
      const treeView = tree(path.join(modularRoot, 'dist', 'sample-esm-view'), {
        hashIgnores: [
          outputJsEntrypoint,
          entrypointJsMapPath,
          'package.json',
          '_trampoline.js',
        ],
      });
      const treeSnapshot = `
        "sample-esm-view
        ├─ index.html #17sfbiz
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #14ismmk
              ├─ ${outputJsEntrypoint}
              └─ ${entrypointJsMapPath}"
      `;
      expect(treeView).toMatchInlineSnapshot(treeSnapshot);
    });

    it('THEN matches the entrypoint snapshot', async () => {
      const { module: moduleEntryPoint } = outputManifest;
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        moduleEntryPoint as string,
      );
      // Strip the last line to remove the source maps, which may vary according to the underlying OS terminator
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view with a custom ESM CDN', () => {
    let outputJsEntrypoint: string;
    let outputJsEntrypointPath: string;

    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });

      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
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
        await fs.readFile(path.join(baseDir, outputJsEntrypoint))
      ).toString();
      expect(trampolineFile).toContain(`https://mycustomcdn.net/react@1`);
      expect(trampolineFile).toContain(`https://mycustomcdn.net/react-dom@1`);
      expect(indexFile).toContain(`https://mycustomcdn.net/react@1`);
    });

    it('THEN matches the entrypoint snapshot', async () => {
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        outputJsEntrypointPath,
      );
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view with various kinds of package dependencies with esbuild', () => {
    let outputJsEntrypoint: string;
    let outputJsEntrypointPath: string;

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

      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
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
        await fs.readFile(path.join(baseDir, outputJsEntrypoint))
      ).toString();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@1`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@^4.17.21`);
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2`,
      );
    });

    it('THEN matches the entrypoint snapshot', async () => {
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        outputJsEntrypointPath,
      );
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view with various kinds of package dependencies with webpack', () => {
    let outputJsEntrypoint: string;
    let outputJsEntrypointPath: string;

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

      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
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
        await fs.readFile(path.join(baseDir, outputJsEntrypoint))
      ).toString();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@1`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@^4.17.21`);
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2`,
      );
    });

    it('THEN matches the entrypoint snapshot', async () => {
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        outputJsEntrypointPath,
      );
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view with a series of CDN selective dependency resolutions with the resolution field with webpack', () => {
    let outputJsEntrypoint: string;
    let outputJsEntrypointPath: string;

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
          resolutions: {
            react: '17.0.2',
            'url-join': '5.0.0',
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
          EXTERNAL_CDN_TEMPLATE:
            'https://mycustomcdn.net/[name]@[version]?selectiveDeps=[selectiveCDNResolutions]',
        },
      });
      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
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
        await fs.readFile(path.join(baseDir, outputJsEntrypoint))
      ).toString();

      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash@^4.17.21?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
    });

    it('THEN matches the entrypoint snapshot', async () => {
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        outputJsEntrypointPath,
      );
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view with a series of CDN selective dependency resolutions with the resolution field with esbuild', () => {
    let outputJsEntrypoint: string;
    let outputJsEntrypointPath: string;

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
          resolutions: {
            react: '17.0.2',
            'url-join': '5.0.0',
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
          EXTERNAL_CDN_TEMPLATE:
            'https://mycustomcdn.net/[name]@[version]?selectiveDeps=[selectiveCDNResolutions]',
        },
      });

      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
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
        await fs.readFile(path.join(baseDir, outputJsEntrypoint))
      ).toString();

      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash@^4.17.21?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
    });

    it('THEN matches the entrypoint snapshot', async () => {
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        outputJsEntrypointPath,
      );
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view with resolutions', () => {
    let outputJsEntrypoint: string;
    let outputJsEntrypointPath: string;

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

      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
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
        await fs.readFile(path.join(baseDir, outputJsEntrypoint))
      ).toString();

      expect(indexFile).toContain(`https://mycustomcdn.net/react@1`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@4`);
    });

    it('THEN matches the entrypoint snapshot', async () => {
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        outputJsEntrypointPath,
      );
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view with resolutions and webpack', () => {
    let outputJsEntrypoint: string;
    let outputJsEntrypointPath: string;

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

      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
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
        await fs.readFile(path.join(baseDir, outputJsEntrypoint))
      ).toString();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@1`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@4`);
    });

    it('THEN matches the entrypoint snapshot', async () => {
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        outputJsEntrypointPath,
      );
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten', () => {
    let outputJsEntrypoint: string;
    let outputJsEntrypointPath: string;

    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_BLOCK_LIST: 'lodash,lodash.merge',
        },
      });

      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
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
        await fs.readFile(path.join(baseDir, outputJsEntrypoint))
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
      ).toEqual(['lodash', 'lodash.merge']);
    });

    it('THEN matches the entrypoint snapshot', async () => {
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        outputJsEntrypointPath,
      );
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten using wildcards', () => {
    let outputJsEntrypoint: string;
    let outputJsEntrypointPath: string;

    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_BLOCK_LIST: 'lodash*',
        },
      });

      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
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
        await fs.readFile(path.join(baseDir, outputJsEntrypoint))
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
      ).toEqual(['lodash', 'lodash.merge']);
    });

    it('THEN matches the entrypoint snapshot', async () => {
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        outputJsEntrypointPath,
      );
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten using allow list and wildcards', () => {
    let outputJsEntrypoint: string;
    let outputJsEntrypointPath: string;

    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_ALLOW_LIST: 'react*',
        },
      });

      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
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
        await fs.readFile(path.join(baseDir, outputJsEntrypoint))
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

    it('THEN matches the entrypoint snapshot', async () => {
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        outputJsEntrypointPath,
      );
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view specifying a PUBLIC_URL', () => {
    let outputJsEntrypoint: string;
    let outputJsEntrypointPath: string;

    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          PUBLIC_URL: '/public/path/',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });

      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypoint = manifestInfo.jsEntrypointName;
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
    });

    it('THEN expects the correct source in package.json', () => {
      expect(outputJsEntrypointPath.startsWith('/public/path')).toBeTruthy();
    });

    it('THEN matches the entrypoint snapshot', async () => {
      const packageEntryPointPath = path.join(
        modularRoot,
        'dist',
        'sample-esm-view',
        'static',
        'js',
        outputJsEntrypoint,
      );
      const entrypointWithoutSources = stripLastLine(
        await fs.readFile(packageEntryPointPath, 'utf8'),
      );
      expect(
        prettier.format(entrypointWithoutSources, {
          filepath: outputJsEntrypoint,
        }),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building a esm-view specifying a PUBLIC_URL and the path is ./', () => {
    let outputJsEntrypointPath: string;

    beforeAll(async () => {
      await modular('build sample-esm-view', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
          PUBLIC_URL: './',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });

      const manifestInfo = await getPackageOutputManifest('sample-esm-view');
      outputJsEntrypointPath = manifestInfo.jsEntrypointPath;
    });

    it('THEN expects the correct source in package.json', () => {
      expect(outputJsEntrypointPath.startsWith('./static/js/')).toBeTruthy();
    });
  });
});

async function getPackageOutputManifest(target: string) {
  const manifest = (await fs.readJson(
    path.join(modularRoot, 'dist', target, 'package.json'),
  )) as CoreProperties;

  if (!manifest.module) {
    throw new Error('Module has no entrypoint!');
  }

  const jsEntrypointPath = manifest.module;
  const jsEntrypointName = path.basename(jsEntrypointPath);

  return { manifest, jsEntrypointName, jsEntrypointPath };
}

function stripLastLine(content: string) {
  if (content.lastIndexOf('\n') > 0) {
    return content.substring(0, content.lastIndexOf('\n'));
  } else {
    return content;
  }
}
