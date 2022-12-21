import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';
import prettier from 'prettier';
import { createModularTestContext, runModularStreamlined } from '../test/utils';

// These tests must be executed sequentially with `--runInBand`.

const tempModularRepo = createModularTestContext();
const packagesPath = path.join(tempModularRepo, 'packages');

describe('when working with an app', () => {
  beforeAll(async () => {
    await runModularStreamlined(
      tempModularRepo,
      'add sample-esbuild-app --unstable-type app',
      {
        env: {
          USE_MODULAR_ESBUILD: 'true',
        },
      },
    );

    await runModularStreamlined(tempModularRepo, 'build sample-esbuild-app', {
      env: {
        USE_MODULAR_ESBUILD: 'true',
      },
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
      │  │  └─ App.test.tsx #1u72nad
      │  ├─ index.css #o7sk21
      │  ├─ index.tsx #zdn6mw
      │  ├─ logo.svg #1okqmlj
      │  └─ react-app-env.d.ts #t4ygcy
      └─ tsconfig.json #6rw46b"
    `);
  });

  it('can build an app', () => {
    expect(tree(path.join(tempModularRepo, 'dist', 'sample-esbuild-app')))
      .toMatchInlineSnapshot(`
      "sample-esbuild-app
      ├─ favicon.ico #6pu3rg
      ├─ index.html #1wtu0d9
      ├─ logo192.png #1nez7vk
      ├─ logo512.png #1hwqvcc
      ├─ manifest.json #19gah8o
      ├─ package.json
      ├─ robots.txt #1sjb8b3
      └─ static
         ├─ css
         │  ├─ index-PE2NG66F.css #1t4q6xl
         │  └─ index-PE2NG66F.css.map #za6yi0
         ├─ js
         │  ├─ index-QBVJFCSN.js #1xqlxrg
         │  └─ index-QBVJFCSN.js.map #azbxre
         └─ media
            └─ logo-PGX3QVVN.svg #1okqmlj"
    `);
  });

  it('can generate a index.html', async () => {
    expect(
      prettier.format(
        String(
          await fs.readFile(
            path.join(
              tempModularRepo,
              'dist',
              'sample-esbuild-app',
              'index.html',
            ),
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
            path.join(
              tempModularRepo,
              'dist',
              'sample-esbuild-app',
              'static',
              'js',
              'index-QBVJFCSN.js',
            ),
          ),
        ),
        {
          filepath: 'index.js',
        },
      ),
    ).toMatchSnapshot();
  });

  it('can generate a index.js.map', () => {
    expect(readSourceMap('static/js/index-QBVJFCSN.js.map')).toMatchSnapshot();
  });

  it('can generate a index.css.map', () => {
    expect(
      readSourceMap('static/css/index-PE2NG66F.css.map'),
    ).toMatchSnapshot();
  });
});

type SourceMap = Record<string, string | string[]>;

const readSourceMap = (pathName: string) => {
  const map = fs.readJsonSync(
    path.join(tempModularRepo, 'dist', 'sample-esbuild-app', pathName),
  ) as SourceMap;
  return {
    ...map,
    // make the source root //modular so that it's the same
    // across platforms
    sourceRoot: '//modular',
  };
};
