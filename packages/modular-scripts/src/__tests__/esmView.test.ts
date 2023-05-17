import { exec } from 'child_process';
import path from 'path';
import { setTimeout } from 'timers';
import execa from 'execa';
import tree from 'tree-view-for-tests';
import fs from 'fs-extra';
import {
  getDocument,
  getQueriesForElement,
  queries,
} from 'pptr-testing-library';
import puppeteer from 'puppeteer';
import { normalizeToPosix } from '../build-scripts/esbuild-scripts/utils/formatPath';
import { DevServer, startApp } from './start-app';
import { createModularTestContext, runModularForTests } from '../test/utils';
import { rewriteModuleSpecifier } from '../utils/importInfo';
import {
  addPackageForTests,
  buildPackageForTests,
  setupMocks,
} from '../test/mockFunctions';
import type { CoreProperties } from '@schemastore/package';

// Temporary text context paths
let tempModularRepo: string;
let tempPackagesPath: string;
let tempDistPath: string;

// Variables set by tests pointing to build output
let buildOutputJsEntrypoint: string;
let buildOutputJsEntrypointPath: string;

// eslint-disable-next-line @typescript-eslint/unbound-method
const { getNodeText } = queries;

describe('rewriteModuleSpecifier', () => {
  it('rewrites module paths at the end when there is no [path] specifier', () => {
    expect(
      rewriteModuleSpecifier(
        {
          externalDependencies: { 'module-name': '^1.0.0' },
          externalResolutions: { 'module-name': '1.0.1' },
          selectiveCDNResolutions: {},
          importSet: new Set(['module-name']),
          externalCdnTemplate: 'https://mycdn/[name]@[resolution]',
        },
        'module-name/this/is/my/path',
      ),
    ).toBe('https://mycdn/module-name@1.0.1/this/is/my/path');
  });

  it('rewrites module paths when there is a [path] specifier', () => {
    expect(
      rewriteModuleSpecifier(
        {
          externalDependencies: { 'module-name': '^1.0.0' },
          externalResolutions: { 'module-name': '1.0.1' },
          selectiveCDNResolutions: {},
          importSet: new Set(['module-name']),
          externalCdnTemplate: 'https://mycdn/[name][path]@[resolution]',
        },
        'module-name/this/is/my/path',
      ),
    ).toBe('https://mycdn/module-name/this/is/my/path@1.0.1');
  });
});

// These tests must be executed sequentially with `--runInBand`.
describe('modular working with an esm-view', () => {
  const targetedView = 'sample-esm-view';
  beforeAll(async () => {
    tempModularRepo = createModularTestContext();
    tempPackagesPath = path.join(tempModularRepo, 'packages');
    tempDistPath = path.join(tempModularRepo, 'dist');
    setupMocks(tempModularRepo);

    await addPackageForTests(targetedView, 'esm-view');

    await fs.copyFile(
      path.join(__dirname, 'TestEsmView.test-tsx'),
      path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
    );
  });

  describe('Adds packages correctly', () => {
    it('can add a esm-view', () => {
      expect(tree(path.join(tempPackagesPath, targetedView)))
        .toMatchInlineSnapshot(`
        "sample-esm-view
        ├─ README.md #lr4tm5
        ├─ package.json
        └─ src
           ├─ EsmView.css #x6onxt
           ├─ __tests__
           │  └─ EsmView.test.tsx #p6zl64
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
      devServer = await startApp(
        targetedView,
        {
          env: { PORT: port, USE_MODULAR_ESBUILD: 'true' },
        },
        tempModularRepo,
      );
      // Wait two seconds to ensure app started fully
      await new Promise((f) => setTimeout(f, 2000));
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
      const { findByTestId } = getQueriesForElement(await getDocument(page));

      const form = await findByTestId('test-this');
      const text = await getNodeText(form);
      expect(text).toBe('this is a modular esm-view');
    });
  });

  describe('WHEN building a esm-view', () => {
    let buildOutputPackageJson: CoreProperties;

    beforeAll(async () => {
      setupMocks(tempModularRepo);
      await buildPackageForTests(targetedView, ['useModularEsbuild: true']);

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
      buildOutputPackageJson = await getBuildOutputPackageJson(
        targetedView,
        tempDistPath,
      );
    });

    it('THEN outputs the correct package.json in the dist directory', () => {
      const { module: _, ...manifest } = buildOutputPackageJson;
      // Omit module from manifest as we test it separately, in a more informative way
      expect(manifest).toMatchInlineSnapshot(`
          {
            "bundledDependencies": [],
            "dependencies": {
              "react": "^18.2.0",
            },
            "modular": {
              "type": "esm-view",
            },
            "name": "sample-esm-view",
            "version": "1.0.0",
          }
        `);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(
        fs.existsSync(
          getPackageEntryPointPath(
            targetedView,
            tempDistPath,
            buildOutputJsEntrypointPath,
          ),
        ),
      ).toBeTruthy();
    });
  });

  describe('WHEN starting a esm-view (webpack)', () => {
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
      devServer = await startApp(
        targetedView,
        {
          env: { PORT: port },
        },
        tempModularRepo,
      );
      // Wait two seconds to ensure app started fully
      await new Promise((f) => setTimeout(f, 2000));
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
      const { findByTestId } = getQueriesForElement(await getDocument(page));

      const form = await findByTestId('test-this');
      const text = await getNodeText(form);
      expect(text).toBe('this is a modular esm-view');
    });
  });

  describe('WHEN building a esm-view with a custom ESM CDN', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      await buildPackageForTests(targetedView, [
        'useModularEsbuild: true',
        'externalCdnTemplate: "https://mycustomcdn.net/[name]@[version]"',
      ]);

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN rewrites the dependencies according to the template string', async () => {
      const trampolineFile = (
        await fs.readFile(
          path.join(
            getBuildStaticJsDirPath(targetedView, tempDistPath),
            '_trampoline.js',
          ),
        )
      ).toString();

      expect(trampolineFile).toContain(`https://mycustomcdn.net/react@`);
      expect(trampolineFile).toContain(`https://mycustomcdn.net/react-dom@^`);
      expect(
        await getIndexFile(targetedView, tempDistPath, buildOutputJsEntrypoint),
      ).toContain(`https://mycustomcdn.net/react@`);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(
        fs.existsSync(
          getPackageEntryPointPath(
            targetedView,
            tempDistPath,
            buildOutputJsEntrypointPath,
          ),
        ),
      ).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with various kinds of package dependencies with esbuild', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      await addToPackageJson(targetedView, tempPackagesPath, {
        dependencies: {
          lodash: '^4.17.21',
          'lodash.merge': '^4.6.2',
          'regular-table': '^0.5.6',
        },
      });

      await runYarn();

      await buildPackageForTests(targetedView, [
        'useModularEsbuild: true',
        'externalCdnTemplate: "https://mycustomcdn.net/[name]@[version]"',
      ]);

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN a manifest is generated with the styleImports field pointing to the external CSS dependency, rewritten to CDN', async () => {
      const manifestContent = await getBuildOutputPackageJson(
        targetedView,
        tempDistPath,
      );
      expect(manifestContent['styleImports']).toEqual([
        'https://mycustomcdn.net/regular-table@^0.5.6/dist/css/material.css',
      ]);
    });

    it('THEN the synthetic index.html has a style tags pointing to the external CSS dependencies, rewritten to CDN', async () => {
      const outputIndex = path.join(tempDistPath, targetedView, 'index.html');
      const indexContent = await fs.readFile(outputIndex, 'utf-8');
      expect(indexContent).toContain(
        '<link rel="stylesheet"href="https://mycustomcdn.net/regular-table@^0.5.6/dist/css/material.css">',
      );
    });

    it('THEN rewrites the dependencies', async () => {
      const indexFile = await getIndexFile(
        targetedView,
        tempDistPath,
        buildOutputJsEntrypoint,
      );
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@^4.17.21`);
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2`,
      );
      // CSS external dependencies are not rewritten in the source
      expect(indexFile).not.toContain('material.css');
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(
        fs.existsSync(
          getPackageEntryPointPath(
            targetedView,
            tempDistPath,
            buildOutputJsEntrypointPath,
          ),
        ),
      ).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with various kinds of package dependencies with webpack', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);

      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      await addToPackageJson(targetedView, tempPackagesPath, {
        dependencies: {
          lodash: '^4.17.21',
          'lodash.merge': '^4.6.2',
          'regular-table': '^0.5.6',
        },
      });

      await runYarn();

      // TODO: Switch to the below line once we get Webpack working in tests without execa
      // await buildPackageForTests(targetedView, [
      //   'externalCdnTemplate: "https://mycustomcdn.net/[name]@[version]"',
      // ]);
      buildSampleEsmView(targetedView, tempModularRepo, {
        env: {
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN rewrites the dependencies', async () => {
      const indexFile = await getIndexFile(
        targetedView,
        tempDistPath,
        buildOutputJsEntrypoint,
      );
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@^4.17.21`);
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2`,
      );
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(
        fs.existsSync(
          getPackageEntryPointPath(
            targetedView,
            tempDistPath,
            buildOutputJsEntrypointPath,
          ),
        ),
      ).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with a series of CDN selective dependency resolutions with the resolution field with webpack', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);

      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      await addToPackageJson(targetedView, tempPackagesPath, {
        dependencies: {
          lodash: '^4.17.21',
          'lodash.merge': '^4.6.2',
          'regular-table': '^0.5.6',
        },
        resolutions: {
          react: '17.0.2',
          'url-join': '5.0.0',
        },
      });

      await runYarn();

      // TODO: Switch to the below line once we get Webpack working in tests without execa
      // await buildPackageForTests(targetedView, [
      //   'externalCdnTemplate: "https://mycustomcdn.net/[name]@[version]?selectiveDeps=[selectiveCDNResolutions]"',
      // ]);
      buildSampleEsmView(targetedView, tempModularRepo, {
        env: {
          EXTERNAL_CDN_TEMPLATE:
            'https://mycustomcdn.net/[name]@[version]?selectiveDeps=[selectiveCDNResolutions]',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN rewrites the dependencies', async () => {
      const indexFile = await getIndexFile(
        targetedView,
        tempDistPath,
        buildOutputJsEntrypoint,
      );

      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash@^4.17.21?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(
        fs.existsSync(
          getPackageEntryPointPath(
            targetedView,
            tempDistPath,
            buildOutputJsEntrypointPath,
          ),
        ),
      ).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with a series of CDN selective dependency resolutions with the resolution field with esbuild', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);

      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      await addToPackageJson(targetedView, tempPackagesPath, {
        dependencies: {
          lodash: '^4.17.21',
          'lodash.merge': '^4.6.2',
          'regular-table': '^0.5.6',
        },
        resolutions: {
          react: '17.0.2',
          'url-join': '5.0.0',
        },
      });

      await runYarn();

      await buildPackageForTests(targetedView, [
        'useModularEsbuild: true',
        'externalCdnTemplate: "https://mycustomcdn.net/[name]@[version]?selectiveDeps=[selectiveCDNResolutions]"',
      ]);

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN rewrites the dependencies', async () => {
      const indexFile = await getIndexFile(
        targetedView,
        tempDistPath,
        buildOutputJsEntrypoint,
      );

      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash@^4.17.21?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(
        fs.existsSync(
          getPackageEntryPointPath(
            targetedView,
            tempDistPath,
            buildOutputJsEntrypointPath,
          ),
        ),
      ).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with resolutions', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);

      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      await addToPackageJson(targetedView, tempPackagesPath, {
        dependencies: {
          lodash: '^4.17.21',
          'lodash.merge': '^4.6.2',
          'regular-table': '^0.5.6',
        },
      });

      await runYarn();

      await buildPackageForTests(targetedView, [
        'useModularEsbuild: true',
        'externalCdnTemplate: "https://mycustomcdn.net/[name]@[resolution]"',
      ]);

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN rewrites the dependencies', async () => {
      const indexFile = await getIndexFile(
        targetedView,
        tempDistPath,
        buildOutputJsEntrypoint,
      );

      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@4`);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(
        fs.existsSync(
          getPackageEntryPointPath(
            targetedView,
            tempDistPath,
            buildOutputJsEntrypointPath,
          ),
        ),
      ).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with resolutions and webpack', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);

      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      await addToPackageJson(targetedView, tempPackagesPath, {
        dependencies: {
          lodash: '^4.17.21',
          'lodash.merge': '^4.6.2',
          'regular-table': '^0.5.6',
        },
      });

      await runYarn();

      // TODO: Switch to the below line once we get Webpack working in tests without execa
      // await buildPackageForTests(targetedView, [
      //   'externalCdnTemplate: "https://mycustomcdn.net/[name]@[resolution]"',
      // ]);
      buildSampleEsmView(targetedView, tempModularRepo, {
        env: {
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[resolution]',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN rewrites the dependencies', async () => {
      const indexFile = await getIndexFile(
        targetedView,
        tempDistPath,
        buildOutputJsEntrypoint,
      );
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@4`);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(
        fs.existsSync(
          getPackageEntryPointPath(
            targetedView,
            tempDistPath,
            buildOutputJsEntrypointPath,
          ),
        ),
      ).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      // TODO: Use buildPackageForTests once this error is fixed:
      // "Dependency react-dom found in package.json but not in lockfile. Have you installed your dependencies?""
      // await buildPackageForTests(targetedView, [
      //   'useModularEsbuild: true',
      //   'externalCdnTemplate: "https://mycustomcdn.net/[name]@[version]"',
      //   'externalBlockList: ["lodash", "lodash.merge"]',
      // ]);
      buildSampleEsmView(targetedView, tempModularRepo, {
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_BLOCK_LIST: 'lodash,lodash.merge',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN rewrites only the dependencies that are not specified in the blocklist', async () => {
      const indexFile = await getIndexFile(
        targetedView,
        tempDistPath,
        buildOutputJsEntrypoint,
      );
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash.merge@`);
    });

    it('THEN expects the correct bundledDependencies in package.json', async () => {
      expect(
        (await getBuildOutputPackageJson(targetedView, tempDistPath))
          .bundledDependencies,
      ).toEqual(['lodash', 'lodash.merge']);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(
        fs.existsSync(
          getPackageEntryPointPath(
            targetedView,
            tempDistPath,
            buildOutputJsEntrypointPath,
          ),
        ),
      ).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten using wildcards', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      // TODO: Use buildPackageForTests once this error is fixed:
      // "Dependency react-dom found in package.json but not in lockfile. Have you installed your dependencies?""
      // await buildPackageForTests(targetedView, [
      //   'useModularEsbuild: true',
      //   'externalCdnTemplate: "https://mycustomcdn.net/[name]@[version]"',
      //   'externalBlockList: ["lodash*"]',
      // ]);
      buildSampleEsmView(targetedView, tempModularRepo, {
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_BLOCK_LIST: 'lodash*',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN rewrites only the dependencies that are not specified in the blocklist', async () => {
      const indexFile = await getIndexFile(
        targetedView,
        tempDistPath,
        buildOutputJsEntrypoint,
      );

      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash.merge@`);
    });

    it('THEN expects the correct bundledDependencies in package.json', async () => {
      expect(
        (await getBuildOutputPackageJson(targetedView, tempDistPath))
          .bundledDependencies,
      ).toEqual(['lodash', 'lodash.merge']);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(
        fs.existsSync(
          getPackageEntryPointPath(
            targetedView,
            tempDistPath,
            buildOutputJsEntrypointPath,
          ),
        ),
      ).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten using allow list and wildcards', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      // TODO: Use buildPackageForTests once this error is fixed:
      // "Dependency react-dom found in package.json but not in lockfile. Have you installed your dependencies?""
      // await buildPackageForTests(targetedView, [
      //   'useModularEsbuild: true',
      //   'externalCdnTemplate: "https://mycustomcdn.net/[name]@[version]"',
      //   'externalBlockList: ["react*"]',
      // ]);
      buildSampleEsmView(targetedView, tempModularRepo, {
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_ALLOW_LIST: 'react*',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN rewrites only the dependencies that are not specified in the blocklist', async () => {
      const indexFile = await getIndexFile(
        targetedView,
        tempDistPath,
        buildOutputJsEntrypoint,
      );
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash.merge@`);
    });

    it('THEN expects the correct bundledDependencies in package.json', async () => {
      expect(
        (await getBuildOutputPackageJson(targetedView, tempDistPath))
          .bundledDependencies,
      ).toEqual(['lodash', 'lodash.merge', 'regular-table']);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(
        fs.existsSync(
          getPackageEntryPointPath(
            targetedView,
            tempDistPath,
            buildOutputJsEntrypointPath,
          ),
        ),
      ).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view specifying a PUBLIC_URL', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      await buildPackageForTests(targetedView, [
        'useModularEsbuild: true',
        'publicUrl: "/public/path/"',
        'externalCdnTemplate: "https://mycustomcdn.net/[name]@[version]"',
      ]);

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN expects the correct source in package.json', () => {
      expect(
        normalizeToPosix(buildOutputJsEntrypointPath).startsWith(
          '/public/path',
        ),
      ).toBeTruthy();
    });

    it('THEN outputs a JS entrypoint file', () => {
      const packageEntryPointPath = path.join(
        getBuildStaticJsDirPath(targetedView, tempDistPath),
        buildOutputJsEntrypoint,
      );
      expect(fs.existsSync(packageEntryPointPath)).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view specifying a PUBLIC_URL and the path is ./', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      await buildPackageForTests(targetedView, [
        'useModularEsbuild: true',
        'publicUrl: "./"',
        'externalCdnTemplate: "https://mycustomcdn.net/[name]@[version]"',
      ]);

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint(targetedView, tempDistPath);
    });

    it('THEN expects the correct source in package.json', () => {
      expect(
        normalizeToPosix(buildOutputJsEntrypointPath).startsWith(
          './static/js/',
        ),
      ).toBeTruthy();
    });
  });
});

describe('modular working with an esm-view with custom index.html', () => {
  const targetedView = 'sample-esm-view-with-index';
  beforeAll(async () => {
    tempModularRepo = createModularTestContext();
    tempPackagesPath = path.join(tempModularRepo, 'packages');
    tempDistPath = path.join(tempModularRepo, 'dist');
    setupMocks(tempModularRepo);

    await addPackageForTests(targetedView, 'esm-view');

    await Promise.all([
      fs.copyFile(
        path.join(__dirname, 'TestEsmView.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      ),
      fs.mkdir(path.join(tempPackagesPath, targetedView, 'public')),
    ]);
    await fs.copyFile(
      path.join(__dirname, 'CustomIndex-html'),
      path.join(tempPackagesPath, targetedView, 'public', 'index.html'),
    );
  });

  describe('Adds packages correctly', () => {
    it('can add a esm-view', () => {
      expect(tree(path.join(tempPackagesPath, targetedView)))
        .toMatchInlineSnapshot(`
        "sample-esm-view-with-index
        ├─ README.md #dz72za
        ├─ package.json
        ├─ public
        │  └─ index.html #1r28b1o
        └─ src
           ├─ EsmView.css #x6onxt
           ├─ __tests__
           │  └─ EsmView.test.tsx #p6zl64
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
      devServer = await startApp(
        targetedView,
        {
          env: { PORT: port, USE_MODULAR_ESBUILD: 'true' },
        },
        tempModularRepo,
      );
      // Wait two seconds to ensure app started fully
      await new Promise((f) => setTimeout(f, 2000));
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
        exec(`yarnpkg kill-port ${port}`, (err) => {
          if (err) {
            console.log('err: ', err);
          }
          console.log(`Cleaned up processes on port ${port}`);
        });
      }
    });

    it('THEN can start a esm-view with custom index', async () => {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${port}`, {});

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { findByTestId } = getQueriesForElement(await getDocument(page));

      const form = await findByTestId('custom-index');
      const text = await getNodeText(form);
      expect(text).toBe('This will appear before #root');
    });
  });

  describe('WHEN building a esm-view', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      await buildPackageForTests(targetedView, ['useModularEsbuild: true']);
    });

    it('THEN outputs the custom index.html', async () => {
      const outputIndex = await fs.readFile(
        path.join(tempDistPath, targetedView, 'index.html'),
        'utf8',
      );
      expect(outputIndex).toContain(
        '<div data-testid="custom-index">This will appear before #root</div>',
      );
    });
  });
});

async function getBuildOutputEntrypoint(
  targetedView: string,
  tempDistPath: string,
): Promise<[string, string]> {
  const manifest = await getBuildOutputPackageJson(targetedView, tempDistPath);

  if (!manifest.module) {
    throw new Error('Module has no entrypoint!');
  }

  const jsEntrypointPath = manifest.module;
  const jsEntrypointName = path.basename(jsEntrypointPath);

  return [jsEntrypointName, jsEntrypointPath];
}

async function getBuildOutputPackageJson(
  targetedView: string,
  tempDistPath: string,
): Promise<CoreProperties> {
  return (await fs.readJson(
    path.join(tempDistPath, targetedView, 'package.json'),
  )) as CoreProperties;
}

function buildSampleEsmView(
  targetedView: string,
  cwd: string,
  opts?: Record<string, unknown>,
): execa.ExecaSyncReturnValue<string> {
  return runModularForTests(cwd, `build ${targetedView}`, opts);
}

function getPackageEntryPointPath(
  targetedView: string,
  tempDistPath: string,
  buildOutputJsEntrypointPath: string,
): string {
  return path.join(tempDistPath, targetedView, buildOutputJsEntrypointPath);
}

function getBuildStaticJsDirPath(
  targetedView: string,
  tempDistPath: string,
): string {
  return path.join(tempDistPath, targetedView, 'static', 'js');
}

async function getIndexFile(
  targetedView: string,
  tempDistPath: string,
  buildOutputJsEntrypoint: string,
): Promise<string> {
  return (
    await fs.readFile(
      path.join(
        getBuildStaticJsDirPath(targetedView, tempDistPath),
        buildOutputJsEntrypoint,
      ),
    )
  ).toString();
}

async function addToPackageJson(
  targetedView: string,
  tempPackagesPath: string,
  content: CoreProperties,
) {
  const packageJsonPath = path.join(
    tempPackagesPath,
    targetedView,
    'package.json',
  );
  const packageJson = (await fs.readJSON(packageJsonPath)) as CoreProperties;

  await fs.writeJSON(packageJsonPath, Object.assign(packageJson, content));
}

async function runYarn() {
  await execa('yarnpkg', [], {
    cwd: tempModularRepo,
    cleanup: true,
  });
}
