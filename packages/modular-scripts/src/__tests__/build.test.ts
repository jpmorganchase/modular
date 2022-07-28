import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';

import { addFixturePackage, cleanup, modular } from '../test/utils';
import getModularRoot from '../utils/getModularRoot';

const modularRoot = getModularRoot();

describe('WHEN building with preserve modules', () => {
  const packageName = 'sample-async-package';

  beforeAll(async () => {
    await cleanup([packageName]);
    await addFixturePackage(packageName);
    await modular(`build ${packageName} --preserve-modules`, {
      stdio: 'inherit',
    });
  });

  afterAll(async () => await cleanup([packageName]));

  it('THEN expects the correct output package.json', async () => {
    expect(
      await fs.readJson(
        path.join(modularRoot, 'dist', packageName, 'package.json'),
      ),
    ).toMatchInlineSnapshot(`
      Object {
        "dependencies": Object {},
        "files": Array [
          "dist-cjs",
          "dist-es",
          "dist-types",
          "README.md",
        ],
        "main": "dist-cjs/index.js",
        "modular": Object {
          "type": "package",
        },
        "module": "dist-es/index.js",
        "name": "sample-async-package",
        "private": false,
        "typings": "dist-types/index.d.ts",
        "version": "1.0.0",
      }
    `);
  });

  it('THEN expects the correct output directory structure', () => {
    expect(tree(path.join(modularRoot, 'dist', packageName)))
      .toMatchInlineSnapshot(`
      "sample-async-package
      ├─ dist-cjs
      │  ├─ index.js #p1m6x9
      │  ├─ index.js.map #16jes1h
      │  ├─ index2.js #1gdggtn
      │  ├─ index2.js.map #r11rcb
      │  ├─ runAsync.js #kr3qrh
      │  └─ runAsync.js.map #19q2dqp
      ├─ dist-es
      │  ├─ index.js #tcl83f
      │  ├─ index.js.map #yz1h1d
      │  ├─ index2.js #67jtpf
      │  ├─ index2.js.map #1pcnly9
      │  ├─ runAsync.js #1tt0e7o
      │  └─ runAsync.js.map #1tlnsv0
      ├─ dist-types
      │  ├─ index.d.ts #12l2tmi
      │  └─ runAsync.d.ts #1iek7az
      └─ package.json"
    `);
  });

  it('SHOULD create the correct index.js', () => {
    expect(
      String(
        fs.readFileSync(
          path.join(modularRoot, 'dist', packageName, 'dist-es', 'index.js'),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('SHOULD create the correct index2.js', () => {
    expect(
      String(
        fs.readFileSync(
          path.join(modularRoot, 'dist', packageName, 'dist-es', 'index2.js'),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('SHOULD create the correct runAsync.js', () => {
    expect(
      String(
        fs.readFileSync(
          path.join(modularRoot, 'dist', packageName, 'dist-es', 'runAsync.js'),
        ),
      ),
    ).toMatchSnapshot();
  });
});

describe('WHEN building packages with private cross-package dependencies', () => {
  const libraryPackage = 'sample-library-package';
  const dependentPackage = 'sample-depending-package';

  beforeAll(async () => {
    await cleanup([libraryPackage, dependentPackage]);
    await addFixturePackage(libraryPackage);
    await addFixturePackage(dependentPackage);

    // Can't specify it in the fixtures, as we can't nest package.json files in packages
    const package_json = `{
      "name": "${libraryPackage}",
      "version": "1.0.0",
      "main": "src/index.ts",
      "private": true,
      "modular": {
        "type": "package"
      },
      "bin": {
        "sample-library-package": "src/cli.ts"
      }
    }`;

    await fs.writeFile(
      path.join(modularRoot, 'packages', libraryPackage, 'package.json'),
      package_json,
      'utf8',
    );
  });

  afterAll(async () => await cleanup([dependentPackage, libraryPackage]));

  it('THEN expects the correct output package.json from libraryPackage', async () => {
    await modular(`build ${libraryPackage} --preserve-modules --private`, {
      stdio: 'inherit',
    });

    expect(
      await fs.readJson(
        path.join(modularRoot, 'dist', libraryPackage, 'package.json'),
      ),
    ).toMatchInlineSnapshot(`
      Object {
        "bin": Object {
          "sample-library-package": "dist-cjs/cli.js",
        },
        "dependencies": Object {},
        "files": Array [
          "dist-cjs",
          "dist-es",
          "dist-types",
          "README.md",
        ],
        "main": "dist-cjs/index.js",
        "modular": Object {
          "type": "package",
        },
        "module": "dist-es/index.js",
        "name": "sample-library-package",
        "private": true,
        "typings": "dist-types/index.d.ts",
        "version": "1.0.0",
      }
    `);
  });

  it('THEN the build fails by default', () => {
    return expect(
      async () =>
        await modular(`build ${dependentPackage} --preserve-modules`, {
          stdio: 'inherit',
        }),
    ).rejects.toThrow();
  });

  it('THEN the build passes if the --private option is used', async () => {
    await modular(`build ${dependentPackage} --preserve-modules --private`, {
      stdio: 'inherit',
    });

    expect(tree(path.join(modularRoot, 'dist', dependentPackage)))
      .toMatchInlineSnapshot(`
      "sample-depending-package
      ├─ dist-cjs
      │  ├─ index.js #1m9v9ya
      │  ├─ index.js.map #79ot9r
      │  ├─ index2.js #q6vf2j
      │  └─ index2.js.map #10q3jzt
      ├─ dist-es
      │  ├─ index.js #3qxwo1
      │  ├─ index.js.map #yz1h1d
      │  ├─ index2.js #14be4lv
      │  └─ index2.js.map #jfjxet
      ├─ dist-types
      │  └─ index.d.ts #6hjmh9
      └─ package.json"
    `);
  });
});
