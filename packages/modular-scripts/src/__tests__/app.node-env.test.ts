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
// afterAll(cleanup);

describe('when working with a NODE_ENV app', () => {
  beforeAll(async () => {
    await modular(
      'add node-env-app --unstable-type app --unstable-name node-env-app --template node-env-app',
      { stdio: 'inherit' },
    );

    await modular('build node-env-app', {
      stdio: 'inherit',
    });
  });

  it('can add a node-env template with the right content', () => {
    expect(tree(path.join(modularRoot, 'packages', 'node-env-app')))
      .toMatchInlineSnapshot(`
      "node-env-app
      ├─ package.json
      ├─ public
      │  └─ index.html #1m6toxd
      ├─ src
      │  ├─ index.tsx #1rpotzc
      │  └─ react-app-env.d.ts #t4ygcy
      └─ tsconfig.json #6rw46b"
    `);
  });

  it('can build a app', () => {
    expect(tree(path.join(modularRoot, 'dist', 'node-env-app')))
      .toMatchInlineSnapshot(`
      "node-env-app
      ├─ asset-manifest.json #n1rvuh
      ├─ index.html #1yaenq4
      ├─ package.json
      └─ static
         └─ js
            ├─ main.3db228f9.chunk.js #20y3tb
            ├─ main.3db228f9.chunk.js.map #1apl3
            ├─ runtime-main.a0dc6a9b.js #o5bsr9
            └─ runtime-main.a0dc6a9b.js.map #10n4p35"
    `);
  });

  it('can generate a js/main.3db228f9.chunk.js', async () => {
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
              'main.3db228f9.chunk.js',
            ),
          ),
        ),
        {
          filepath: 'main.3db228f9.chunk.js',
        },
      ),
    ).toMatchSnapshot();
  });
});
