import execa from 'execa';
import { exec } from 'child_process';
import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';
import {
  getDocument,
  getQueriesForElement,
  queries,
} from 'pptr-testing-library';
import puppeteer from 'puppeteer';

import { normalizeToPosix } from '../esbuild-scripts/utils/formatPath';
import { startApp, DevServer } from './start-app';
import type { CoreProperties } from '@schemastore/package';
import { createModularTestContext, runModularStreamlined } from '../test/utils';

// Temporary text context paths
let tempModularRepo: string;
let tempPackagesPath: string;
let tempDistPath: string;

// Variables set by tests pointing to build output
let buildOutputJsEntrypoint: string;
let buildOutputJsEntrypointPath: string;

// eslint-disable-next-line @typescript-eslint/unbound-method
const { getNodeText } = queries;

// These tests must be executed sequentially with `--runInBand`.

const targetedView = 'sample-esm-view';

describe('modular-scripts', () => {
  beforeAll(async () => {
    tempModularRepo = createModularTestContext();
    tempPackagesPath = path.join(tempModularRepo, 'packages');
    tempDistPath = path.join(tempModularRepo, 'dist');
    await runModularStreamlined(
      tempModularRepo,
      'add sample-esm-view --unstable-type esm-view --unstable-name sample-esm-view',
    );

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
    let buildOutputPackageJson: CoreProperties;

    beforeAll(async () => {
      await buildSampleEsmView({
        env: {
          USE_MODULAR_ESBUILD: 'true',
        },
      });
      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
      buildOutputPackageJson = await getBuildOutputPackageJson();
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
      expect(fs.existsSync(getPackageEntryPointPath())).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with a custom ESM CDN', () => {
    beforeAll(async () => {
      await buildSampleEsmView({
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
    });

    it('THEN rewrites the dependencies according to the template string', async () => {
      const buildStaticJsPath = getBuildStaticJsDirPath();
      const trampolineFile = (
        await fs.readFile(path.join(buildStaticJsPath, '_trampoline.js'))
      ).toString();

      const indexFile = (
        await fs.readFile(
          path.join(getBuildStaticJsDirPath(), buildOutputJsEntrypoint),
        )
      ).toString();
      expect(trampolineFile).toContain(`https://mycustomcdn.net/react@`);
      expect(trampolineFile).toContain(`https://mycustomcdn.net/react-dom@^`);
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(fs.existsSync(getPackageEntryPointPath())).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with various kinds of package dependencies with esbuild', () => {
    beforeAll(async () => {
      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      const packageJsonPath = getPackageJsonPath();
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

      await runYarn();

      await buildSampleEsmView({
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
    });

    it('THEN a manifest is generated with the styleImports field pointing to the external CSS dependency, rewritten to CDN', async () => {
      const outputManifest = path.join(
        tempDistPath,
        targetedView,
        'package.json',
      );
      const manifestContent = (await fs.readJSON(
        outputManifest,
      )) as CoreProperties;
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
      const indexFile = (
        await fs.readFile(
          path.join(getBuildStaticJsDirPath(), buildOutputJsEntrypoint),
        )
      ).toString();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@^4.17.21`);
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2`,
      );
      // CSS external dependencies are not rewritten in the source
      expect(indexFile).not.toContain('material.css');
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(fs.existsSync(getPackageEntryPointPath())).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with various kinds of package dependencies with webpack', () => {
    beforeAll(async () => {
      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      const packageJsonPath = getPackageJsonPath();
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

      await runYarn();

      await buildSampleEsmView({
        env: {
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
    });

    it('THEN rewrites the dependencies', async () => {
      const indexFile = (
        await fs.readFile(
          path.join(getBuildStaticJsDirPath(), buildOutputJsEntrypoint),
        )
      ).toString();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@^4.17.21`);
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2`,
      );
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(fs.existsSync(getPackageEntryPointPath())).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with a series of CDN selective dependency resolutions with the resolution field with webpack', () => {
    beforeAll(async () => {
      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      const packageJsonPath = getPackageJsonPath();
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

      await runYarn();

      await buildSampleEsmView({
        env: {
          EXTERNAL_CDN_TEMPLATE:
            'https://mycustomcdn.net/[name]@[version]?selectiveDeps=[selectiveCDNResolutions]',
        },
      });
      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
    });

    it('THEN rewrites the dependencies', async () => {
      const indexFile = (
        await fs.readFile(
          path.join(getBuildStaticJsDirPath(), buildOutputJsEntrypoint),
        )
      ).toString();

      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash@^4.17.21?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(fs.existsSync(getPackageEntryPointPath())).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with a series of CDN selective dependency resolutions with the resolution field with esbuild', () => {
    beforeAll(async () => {
      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      const packageJsonPath = getPackageJsonPath();
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

      await runYarn();

      await buildSampleEsmView({
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE:
            'https://mycustomcdn.net/[name]@[version]?selectiveDeps=[selectiveCDNResolutions]',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
    });

    it('THEN rewrites the dependencies', async () => {
      const indexFile = (
        await fs.readFile(
          path.join(getBuildStaticJsDirPath(), buildOutputJsEntrypoint),
        )
      ).toString();

      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash@^4.17.21?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
      expect(indexFile).toContain(
        `https://mycustomcdn.net/lodash.merge@^4.6.2?selectiveDeps=react@17.0.2,url-join@5.0.0`,
      );
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(fs.existsSync(getPackageEntryPointPath())).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with resolutions', () => {
    beforeAll(async () => {
      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      const packageJsonPath = getPackageJsonPath();
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

      await runYarn();

      await buildSampleEsmView({
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[resolution]',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
    });

    it('THEN rewrites the dependencies', async () => {
      const indexFile = (
        await fs.readFile(
          path.join(getBuildStaticJsDirPath(), buildOutputJsEntrypoint),
        )
      ).toString();

      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@4`);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(fs.existsSync(getPackageEntryPointPath())).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view with resolutions and webpack', () => {
    beforeAll(async () => {
      await fs.copyFile(
        path.join(__dirname, 'TestViewPackages.test-tsx'),
        path.join(tempPackagesPath, targetedView, 'src', 'index.tsx'),
      );

      const packageJsonPath = getPackageJsonPath();
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

      await runYarn();

      await buildSampleEsmView({
        env: {
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[resolution]',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
    });

    it('THEN rewrites the dependencies', async () => {
      const indexFile = (
        await fs.readFile(
          path.join(getBuildStaticJsDirPath(), buildOutputJsEntrypoint),
        )
      ).toString();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).toContain(`https://mycustomcdn.net/lodash@4`);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(fs.existsSync(getPackageEntryPointPath())).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten', () => {
    beforeAll(async () => {
      await buildSampleEsmView({
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_BLOCK_LIST: 'lodash,lodash.merge',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
    });

    it('THEN rewrites only the dependencies that are not specified in the blocklist', async () => {
      const indexFile = (
        await fs.readFile(
          path.join(getBuildStaticJsDirPath(), buildOutputJsEntrypoint),
        )
      ).toString();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash.merge@`);
    });

    it('THEN expects the correct bundledDependencies in package.json', async () => {
      expect(
        (
          (await fs.readJson(
            path.join(tempDistPath, targetedView, 'package.json'),
          )) as CoreProperties
        ).bundledDependencies,
      ).toEqual(['lodash', 'lodash.merge']);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(fs.existsSync(getPackageEntryPointPath())).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten using wildcards', () => {
    beforeAll(async () => {
      await buildSampleEsmView({
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_BLOCK_LIST: 'lodash*',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
    });

    it('THEN rewrites only the dependencies that are not specified in the blocklist', async () => {
      const indexFile = (
        await fs.readFile(
          path.join(getBuildStaticJsDirPath(), buildOutputJsEntrypoint),
        )
      ).toString();

      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash.merge@`);
    });

    it('THEN expects the correct bundledDependencies in package.json', async () => {
      expect(
        (
          (await fs.readJson(
            path.join(tempDistPath, targetedView, 'package.json'),
          )) as CoreProperties
        ).bundledDependencies,
      ).toEqual(['lodash', 'lodash.merge']);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(fs.existsSync(getPackageEntryPointPath())).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view specifying a dependency to not being rewritten using allow list and wildcards', () => {
    beforeAll(async () => {
      await buildSampleEsmView({
        env: {
          USE_MODULAR_ESBUILD: 'true',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
          EXTERNAL_ALLOW_LIST: 'react*',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
    });

    it('THEN rewrites only the dependencies that are not specified in the blocklist', async () => {
      const indexFile = (
        await fs.readFile(
          path.join(getBuildStaticJsDirPath(), buildOutputJsEntrypoint),
        )
      ).toString();
      expect(indexFile).toContain(`https://mycustomcdn.net/react@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash@`);
      expect(indexFile).not.toContain(`https://mycustomcdn.net/lodash.merge@`);
    });

    it('THEN expects the correct bundledDependencies in package.json', async () => {
      expect(
        (
          (await fs.readJson(
            path.join(tempDistPath, targetedView, 'package.json'),
          )) as CoreProperties
        ).bundledDependencies,
      ).toEqual(['lodash', 'lodash.merge', 'regular-table']);
    });

    it('THEN outputs a JS entrypoint file', () => {
      expect(fs.existsSync(getPackageEntryPointPath())).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view specifying a PUBLIC_URL', () => {
    beforeAll(async () => {
      await buildSampleEsmView({
        env: {
          USE_MODULAR_ESBUILD: 'true',
          PUBLIC_URL: '/public/path/',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
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
        getBuildStaticJsDirPath(),
        buildOutputJsEntrypoint,
      );
      expect(fs.existsSync(packageEntryPointPath)).toBeTruthy();
    });
  });

  describe('WHEN building a esm-view specifying a PUBLIC_URL and the path is ./', () => {
    beforeAll(async () => {
      await buildSampleEsmView({
        env: {
          USE_MODULAR_ESBUILD: 'true',
          PUBLIC_URL: './',
          EXTERNAL_CDN_TEMPLATE: 'https://mycustomcdn.net/[name]@[version]',
        },
      });

      [buildOutputJsEntrypoint, buildOutputJsEntrypointPath] =
        await getBuildOutputEntrypoint();
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

async function getBuildOutputEntrypoint(): Promise<[string, string]> {
  const manifest = await getBuildOutputPackageJson();

  if (!manifest.module) {
    throw new Error('Module has no entrypoint!');
  }

  const jsEntrypointPath = manifest.module;
  const jsEntrypointName = path.basename(jsEntrypointPath);

  return [jsEntrypointName, jsEntrypointPath];
}

async function getBuildOutputPackageJson(): Promise<CoreProperties> {
  return (await fs.readJson(
    path.join(tempDistPath, targetedView, 'package.json'),
  )) as CoreProperties;
}

async function buildSampleEsmView(
  opts?: Record<string, unknown>,
): Promise<execa.ExecaReturnValue<string>> {
  return await runModularStreamlined(
    tempModularRepo,
    'build sample-esm-view',
    opts,
  );
}

function getPackageEntryPointPath(): string {
  return path.join(tempDistPath, targetedView, buildOutputJsEntrypointPath);
}

function getPackageJsonPath(): string {
  return path.join(tempPackagesPath, targetedView, 'package.json');
}

function getBuildStaticJsDirPath(): string {
  return path.join(tempDistPath, targetedView, 'static', 'js');
}

async function runYarn() {
  await execa('yarnpkg', [], {
    cwd: tempModularRepo,
    cleanup: true,
  });
}
