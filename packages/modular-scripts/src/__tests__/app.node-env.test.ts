import path from 'path';
import tree from 'tree-view-for-tests';
import fs from 'fs-extra';
import prettier from 'prettier';
import rimraf from 'rimraf';
import execa from 'execa';
import {
  createModularTestContext,
  mockInstallTemplate,
  runModularForTests,
} from '../test/utils';
import getModularRoot from '../utils/getModularRoot';

// These tests must be executed sequentially with `--runInBand`.

// Temporary test context paths set by createModularTestContext()
let tempModularRepo: string;

const modularRoot = getModularRoot();

const packagesPath = path.join(getModularRoot(), 'packages');

function cleanup() {
  rimraf.sync(path.join(packagesPath, 'node-env-app'));
  rimraf.sync(path.join(modularRoot, 'dist/node-env-app'));

  // run yarn so yarn.lock gets reset
  return execa.sync('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

describe('when working with a NODE_ENV app', () => {
  describe('WHEN building with webpack', () => {
    beforeAll(async () => {
      cleanup();
      runModularForTests(modularRoot, 'add node-env-app --unstable-type app');

      await fs.writeFile(
        path.join(modularRoot, 'packages', 'node-env-app', 'src', 'index.ts'),
        `
      console.log(process.env.NODE_ENV);
      export {};
    `,
      );
      rimraf.sync(path.join(modularRoot, 'dist/node-env-app'));

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
              ├─ main.a482480b.js.map #4bcy8y
              ├─ runtime-main.97707f9d.js #15lezt9
              └─ runtime-main.97707f9d.js.map #1qz5n9i"
      `);
    });
    it('can generate a js/main.a482480b.js', async () => {
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
  describe('WHEN building with esbuild', () => {
    beforeAll(async () => {
      await setupNodeEnvApp();
      runModularForTests(tempModularRepo, 'build node-env-app', {
        env: {
          USE_MODULAR_ESBUILD: 'true',
        },
      });
    });

    it('can build a app', () => {
      expect(tree(path.join(tempModularRepo, 'dist', 'node-env-app')))
        .toMatchInlineSnapshot(`
        "node-env-app
        ├─ favicon.ico #6pu3rg
        ├─ index.html #177xfr4
        ├─ logo192.png #1nez7vk
        ├─ logo512.png #1hwqvcc
        ├─ manifest.json #19gah8o
        ├─ package.json
        ├─ robots.txt #1sjb8b3
        └─ static
           └─ js
              ├─ index-L2US6VEL.js #7mn428
              └─ index-L2US6VEL.js.map #sr6neg"
      `);
    });

    it('can generate a js/index-L2US6VEL.js', async () => {
      expect(
        prettier.format(
          String(
            await fs.readFile(
              path.join(
                tempModularRepo,
                'dist',
                'node-env-app',
                'static',
                'js',
                'index-L2US6VEL.js',
              ),
            ),
          ),
          {
            filepath: 'index-L2US6VEL.js',
          },
        ),
      ).toMatchSnapshot();
    });
  });
});

/**
 * Create temp modular repo and add an app called node-env-app
 */
async function setupNodeEnvApp(): Promise<void> {
  tempModularRepo = createModularTestContext();
  mockInstallTemplate(
    path.join(getModularRoot(), '__fixtures__/templates'),
    tempModularRepo,
  );
  runModularForTests(
    tempModularRepo,
    'add node-env-app --unstable-type modular-template-app',
  );

  await fs.writeFile(
    path.join(tempModularRepo, 'packages', 'node-env-app', 'src', 'index.ts'),
    `
      console.log(process.env.NODE_ENV);
      export {};
      `,
  );
}
