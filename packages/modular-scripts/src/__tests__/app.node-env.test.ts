import execa from 'execa';
import rimraf from 'rimraf';
import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';
import prettier from 'prettier';
import getModularRoot from '../utils/getModularRoot';

const modularRoot = getModularRoot();

// These tests must be executed sequentially with `--runInBand`.

const packagesPath = path.join(getModularRoot(), 'packages');

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd: modularRoot,
    cleanup: true,
    ...opts,
  });
}

function cleanup() {
  rimraf.sync(path.join(packagesPath, 'node-env-app'));
  rimraf.sync(path.join(modularRoot, 'dist/node-env-app'));

  // run yarn so yarn.lock gets reset
  return execa.sync('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('when working with a NODE_ENV app', () => {
  beforeAll(async () => {
    await modular('add node-env-app --unstable-type app', { stdio: 'inherit' });

    await fs.writeFile(
      path.join(modularRoot, 'packages', 'node-env-app', 'src', 'index.ts'),
      `
      console.log(process.env.NODE_ENV);
      export {};
    `,
    );
  });

  describe('WHEN building with webpack', () => {
    beforeAll(async () => {
      rimraf.sync(path.join(modularRoot, 'dist/node-env-app'));

      await modular('build node-env-app', {
        stdio: 'inherit',
      });
    });

    it('can build a app', () => {
      expect(tree(path.join(modularRoot, 'dist', 'node-env-app')))
        .toMatchInlineSnapshot(`
        "node-env-app
        ├─ asset-manifest.json #1qjm6tq
        ├─ favicon.ico #6pu3rg
        ├─ index.html #z3zac4
        ├─ logo192.png #1nez7vk
        ├─ logo512.png #1hwqvcc
        ├─ manifest.json #19gah8o
        ├─ package.json
        ├─ robots.txt #1sjb8b3
        └─ static
           └─ js
              ├─ main.1c6de6d0.js #1xkcjze
              ├─ main.1c6de6d0.js.map #ayfbwn
              ├─ runtime-main.182069c4.js #r0hm4v
              └─ runtime-main.182069c4.js.map #ul1xez"
      `);
    });

    it('can generate a js/main.1c6de6d0.js', async () => {
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
                'main.1c6de6d0.js',
              ),
            ),
          ),
          {
            filepath: 'main.1c6de6d0.js',
          },
        ),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building with esbuild', () => {
    beforeAll(async () => {
      rimraf.sync(path.join(modularRoot, 'dist/node-env-app'));

      await modular('build node-env-app', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
        },
      });
    });

    it('can build a app', () => {
      expect(tree(path.join(modularRoot, 'dist', 'node-env-app')))
        .toMatchInlineSnapshot(`
        "node-env-app
        ├─ favicon.ico #6pu3rg
        ├─ index.html #yth8pd
        ├─ logo192.png #1nez7vk
        ├─ logo512.png #1hwqvcc
        ├─ manifest.json #19gah8o
        ├─ package.json
        ├─ robots.txt #1sjb8b3
        └─ static
           └─ js
              ├─ index-FG4XHKNZ.js #449tgl
              └─ index-FG4XHKNZ.js.map #j51j3v"
      `);
    });

    it('can generate a js/index-FG4XHKNZ.js', async () => {
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
                'index-FG4XHKNZ.js',
              ),
            ),
          ),
          {
            filepath: 'index-FG4XHKNZ.js',
          },
        ),
      ).toMatchSnapshot();
    });
  });
});
