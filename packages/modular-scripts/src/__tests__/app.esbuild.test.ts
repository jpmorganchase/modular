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
    // @ts-ignore
    env: {
      USE_MODULAR_ESBUILD: 'true',
    },
    ...opts,
  });
}

function cleanup() {
  rimraf.sync(path.join(packagesPath, 'sample-esbuild-app'));
  rimraf.sync(path.join(modularRoot, 'dist/sample-esbuild-app'));

  // run yarn so yarn.lock gets reset
  return execa.sync('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('when working with an app', () => {
  beforeAll(async () => {
    await modular(
      'add sample-esbuild-app --unstable-type app --unstable-name sample-esbuild-app',
      { stdio: 'inherit' },
    );

    await modular('build sample-esbuild-app', {
      stdio: 'inherit',
    });
  });

  it('can add an app', () => {
    expect(tree(path.join(packagesPath, 'sample-esbuild-app')))
      .toMatchInlineSnapshot(`
      "sample-esbuild-app
      ├─ package.json
      ├─ public
      │  ├─ favicon.ico #6pu3rg
      │  ├─ index.html #1m6toxd
      │  ├─ logo192.png #1nez7vk
      │  ├─ logo512.png #1hwqvcc
      │  ├─ manifest.json #19gah8o
      │  └─ robots.txt #1sjb8b3
      ├─ src
      │  ├─ App.css #1o0zosm
      │  ├─ App.tsx #c80ven
      │  ├─ __tests__
      │  │  └─ App.test.tsx #16urcos
      │  ├─ index.css #o7sk21
      │  ├─ index.tsx #zdn6mw
      │  ├─ logo.svg #1okqmlj
      │  └─ react-app-env.d.ts #t4ygcy
      └─ tsconfig.json #6rw46b"
    `);
  });

  it('can build an app', () => {
    expect(
      tree(path.join(modularRoot, 'dist', 'sample-esbuild-app'), {
        hashIgnores: ['index.js.map', 'index.css.map', 'package.json'],
      }),
    ).toMatchInlineSnapshot(`
      "sample-esbuild-app
      ├─ favicon.ico #6pu3rg
      ├─ index.css #90bbzw
      ├─ index.css.map
      ├─ index.html #ojdrji
      ├─ index.js #w0zp6v
      ├─ index.js.map
      ├─ logo-PGX3QVVN.svg #1okqmlj
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      └─ robots.txt #1sjb8b3"
    `);
  });

  it('can generate a index.html', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(modularRoot, 'dist', 'sample-esbuild-app', 'index.html'),
          ),
        ),
        {
          filepath: 'index.html',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a index.js', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(modularRoot, 'dist', 'sample-esbuild-app', 'index.js'),
          ),
        ),
        {
          filepath: 'index.js',
        },
      ),
    ).toMatchSnapshot();
  });

  type SourceMap = Record<string, string | string[]>;

  const readSourceMap = (pathName: string) => {
    const map = fs.readJsonSync(
      path.join(modularRoot, 'dist', 'sample-esbuild-app', pathName),
    ) as SourceMap;
    return {
      ...map,
      // make the source root //modular so that it's the same
      // across platforms
      sourceRoot: '//modular',
    };
  };

  it('can generate a index.js.map', () => {
    expect(readSourceMap('index.js.map')).toMatchSnapshot();
  });

  it('can generate a index.css.map', () => {
    expect(readSourceMap('index.css.map')).toMatchSnapshot();
  });
});
