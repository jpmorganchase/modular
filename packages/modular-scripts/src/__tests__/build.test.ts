import path from 'path';
import execa from 'execa';
import tree from 'tree-view-for-tests';
import fs from 'fs-extra';
import {
  addFixturePackage,
  cleanup,
  createModularTestContext,
  runModularForTests,
  runModularForTestsAsync,
  runModularPipeLogs,
} from '../test/utils';
import getModularRoot from '../utils/getModularRoot';

const modularRoot = getModularRoot();

describe('WHEN building with preserve modules', () => {
  const packageName = 'sample-async-package';

  beforeAll(async () => {
    await cleanup([packageName]);
    await addFixturePackage(packageName);
    runModularForTests(modularRoot, `build ${packageName} --preserve-modules`);
  });

  afterAll(async () => await cleanup([packageName]));

  it('THEN expects the correct output package.json', async () => {
    expect(
      await fs.readJson(
        path.join(modularRoot, 'dist', packageName, 'package.json'),
      ),
    ).toMatchInlineSnapshot(`
      {
        "dependencies": {},
        "engines": {
          "node": ">=16.10.0 || >=18.0.0 || >=20.0.0",
        },
        "files": [
          "dist-cjs",
          "dist-es",
          "dist-types",
        ],
        "main": "dist-cjs/index.js",
        "modular": {
          "type": "package",
        },
        "module": "dist-es/index.js",
        "name": "sample-async-package",
        "private": false,
        "repository": {
          "directory": "packages/sample-async-package",
          "type": "git",
          "url": "https://github.com/jpmorganchase/modular.git",
        },
        "typings": "dist-types/index.d.ts",
        "version": "1.0.0",
      }
    `);
  });

  it('THEN expects the correct output directory structure', () => {
    expect(tree(path.join(modularRoot, 'dist', packageName)))
      .toMatchInlineSnapshot(`
      "sample-async-package
      ├─ LICENSE #1gat5ri
      ├─ dist-cjs
      │  ├─ index.js #p1m6x9
      │  ├─ index.js.map #16jes1h
      │  ├─ index2.js #1gdggtn
      │  ├─ index2.js.map #1pr8j30
      │  ├─ runAsync.js #kr3qrh
      │  └─ runAsync.js.map #1552hj
      ├─ dist-es
      │  ├─ index.js #tcl83f
      │  ├─ index.js.map #yz1h1d
      │  ├─ index2.js #67jtpf
      │  ├─ index2.js.map #1kusida
      │  ├─ runAsync.js #1tt0e7o
      │  └─ runAsync.js.map #4pcbd
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
          path.join(
            getModularRoot(),
            'dist',
            packageName,
            'dist-es',
            'index.js',
          ),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('SHOULD create the correct index2.js', () => {
    expect(
      String(
        fs.readFileSync(
          path.join(
            getModularRoot(),
            'dist',
            packageName,
            'dist-es',
            'index2.js',
          ),
        ),
      ),
    ).toMatchSnapshot();
  });

  it('SHOULD create the correct runAsync.js', () => {
    expect(
      String(
        fs.readFileSync(
          path.join(
            getModularRoot(),
            'dist',
            packageName,
            'dist-es',
            'runAsync.js',
          ),
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
  }
}
`;

    await fs.writeFile(
      path.join(getModularRoot(), 'packages', libraryPackage, 'package.json'),
      package_json,
      'utf8',
    );
  });

  afterAll(async () => await cleanup([dependentPackage, libraryPackage]));

  it('THEN the build fails by default', () => {
    return expect(() =>
      runModularForTestsAsync(
        modularRoot,
        `build ${dependentPackage} --preserve-modules`,
      ),
    ).rejects.toThrow();
  });

  it('THEN the build passes if the --private option is used', () => {
    runModularForTests(
      modularRoot,
      `build ${dependentPackage} --preserve-modules --private`,
    );

    expect(tree(path.join(modularRoot, 'dist', dependentPackage)))
      .toMatchInlineSnapshot(`
      "sample-depending-package
      ├─ LICENSE #1gat5ri
      ├─ dist-cjs
      │  ├─ index.js #1m9v9ya
      │  ├─ index.js.map #79ot9r
      │  ├─ index2.js #q6vf2j
      │  └─ index2.js.map #ug9tqq
      ├─ dist-es
      │  ├─ index.js #3qxwo1
      │  ├─ index.js.map #yz1h1d
      │  ├─ index2.js #14be4lv
      │  └─ index2.js.map #ffeudh
      ├─ dist-types
      │  └─ index.d.ts #6hjmh9
      └─ package.json"
    `);
  });
});

describe('modular build supports custom workspaces', () => {
  const fixturesFolder = path.join(
    getModularRoot(),
    '__fixtures__',
    'custom-workspace-root',
  );

  // Temporary test context paths set by createTempModularRepoWithTemplate()
  let tempModularRepo: string;

  beforeAll(() => {
    tempModularRepo = createModularTestContext();
    fs.copySync(fixturesFolder, tempModularRepo);

    // Create git repo & commit
    if (process.env.GIT_AUTHOR_NAME && process.env.GIT_AUTHOR_EMAIL) {
      execa.sync('git', [
        'config',
        '--global',
        'user.email',
        `"${process.env.GIT_AUTHOR_EMAIL}"`,
      ]);
      execa.sync('git', [
        'config',
        '--global',
        'user.name',
        `"${process.env.GIT_AUTHOR_NAME}"`,
      ]);
    }
    execa.sync('git', ['init'], {
      cwd: tempModularRepo,
    });

    execa.sync('yarn', {
      cwd: tempModularRepo,
    });

    execa.sync('git', ['add', '.'], {
      cwd: tempModularRepo,
    });

    execa.sync('git', ['commit', '-am', '"First commit"'], {
      cwd: tempModularRepo,
    });
  });

  it('builds an app in a different workspace directory', () => {
    const result = runModularPipeLogs(tempModularRepo, 'build app');
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('Compiled successfully.');
  });

  it('builds a package in a different workspace directory', () => {
    const result = runModularPipeLogs(tempModularRepo, 'build alpha');
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('built alpha');
  });
});
