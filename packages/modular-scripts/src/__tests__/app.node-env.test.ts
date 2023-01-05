/* eslint-disable jest/no-commented-out-tests */
import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';
import prettier from 'prettier';
import {
  createModularTestContext,
  mockInstallTemplate,
  runModularStreamlined,
} from '../test/utils';
import getModularRoot from '../utils/getModularRoot';

// These tests must be executed sequentially with `--runInBand`.

// Temporary test context paths set by createModularTestContext()
let tempModularRepo: string;

describe('when working with a NODE_ENV app', () => {
  describe('WHEN building with webpack', () => {
    beforeAll(async () => {
      await setupNodeEnvApp();
      await runModularStreamlined(tempModularRepo, 'build node-env-app');
    });

    it('can build a app', () => {
      expect(tree(path.join(tempModularRepo, 'dist', 'node-env-app')))
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
              ├─ main.ed06689d.js.map #gsgq3i
              ├─ runtime-main.61e0d312.js #13gmjdw
              └─ runtime-main.61e0d312.js.map #17efux7"
      `);
    });

    it('can generate a manifest.json', async () => {
      expect(
        String(
          await fs.readFile(
            path.join(tempModularRepo, 'dist', 'node-env-app', 'manifest.json'),
          ),
        ),
      ).toMatchSnapshot();
    });
    it('can generate a package.json', async () => {
      expect(
        String(
          await fs.readFile(
            path.join(tempModularRepo, 'dist', 'node-env-app', 'package.json'),
          ),
        ),
      ).toMatchSnapshot();
    });
    it('can generate a main.js', async () => {
      expect(
        String(
          await fs.readFile(
            path.join(
              tempModularRepo,
              'dist',
              'node-env-app',
              'static',
              'js',
              'main.ed06689d.js',
            ),
          ),
        ),
      ).toMatchSnapshot();
    });
    it('can generate a main.js.map', async () => {
      expect(
        String(
          await fs.readFile(
            path.join(
              tempModularRepo,
              'dist',
              'node-env-app',
              'static',
              'js',
              'main.ed06689d.js.map',
            ),
          ),
        ),
      ).toMatchSnapshot();
    });
    it('can generate asset manifest', async () => {
      expect(
        String(
          await fs.readFile(
            path.join(
              tempModularRepo,
              'dist',
              'node-env-app',
              'asset-manifest.json',
            ),
          ),
        ),
      ).toMatchSnapshot();
    });

    // it('can generate a js/main.5d879077.js.map', async () => {
    //   expect(
    //     String(
    //       await fs.readFile(
    //         path.join(
    //           tempModularRepo,
    //           'dist',
    //           'node-env-app',
    //           'static',
    //           'js',
    //           'main.c42f5e48.js.map',
    //         ),
    //       ),
    //     ),
    //   ).toMatchSnapshot();
    // });
    // it('can generate a js/main.5d879077.js', async () => {
    //   expect(
    //     String(
    //       await fs.readFile(
    //         path.join(
    //           tempModularRepo,
    //           'dist',
    //           'node-env-app',
    //           'static',
    //           'js',
    //           'main.c42f5e48.js',
    //         ),
    //       ),
    //     ),
    //   ).toMatchSnapshot();
    // });
  });
  describe('WHEN building with esbuild', () => {
    beforeAll(async () => {
      await setupNodeEnvApp();
      await runModularStreamlined(tempModularRepo, 'build node-env-app', {
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
  await runModularStreamlined(
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
