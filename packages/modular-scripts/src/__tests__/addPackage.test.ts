import path from 'path';
import fs from 'fs-extra';
import tree from 'tree-view-for-tests';
import getModularRoot from '../utils/getModularRoot';
import {
  createModularTestContext,
  mockInstallTemplate,
  runModularForTests,
  runModularForTestsAsync,
} from '../test/utils';
import {
  addPackageForTests,
  runTestForTests,
  setupMocks,
} from '../test/mockFunctions';
import type { CoreProperties } from '@schemastore/package';

const modularRoot = getModularRoot();

// Template Paths
const templatesPath = path.join(modularRoot, '__fixtures__', 'templates');
const appTemplatePath = path.join(templatesPath, 'modular-template-app');
const filterTemplatePath = path.join(templatesPath, 'modular-template-filter');
const noFilterTemplatePath = path.join(
  templatesPath,
  'modular-template-no-filter',
);

// Temporary test context paths set by createTempModularRepoWithTemplate()
let tempModularRepo: string;
let tempPackagesPath: string;

/**
 * Calls createModularTestContext to generate a temporary modular repo for testing in
 * Sets temporary repo paths used by tests
 *
 * Run before each test to create a clean test environment
 */
function createTempModularRepoWithTemplate(appTemplatePath: string) {
  tempModularRepo = createModularTestContext();
  tempPackagesPath = path.join(tempModularRepo, 'packages');
  mockInstallTemplate(appTemplatePath, tempModularRepo);
}

describe('When setting a base directory for an app', () => {
  it('fails if trying to add an app outside the "workspaces" directories', async () => {
    createTempModularRepoWithTemplate(appTemplatePath);
    await expect(
      runModularForTestsAsync(
        tempModularRepo,
        'add @scoped/will-not-create-app --path some/other/basepath --unstable-type app',
      ),
    ).rejects.toThrow();
  });
});

describe('When working with a scoped app', () => {
  beforeAll(async () => {
    createTempModularRepoWithTemplate(appTemplatePath);
    setupMocks(tempModularRepo);
    await addPackageForTests('@scoped/sample-app', 'app');
  });

  it('creates the app in the expected directory, with the expected name', async () => {
    const manifest = (await fs.readJSON(
      path.join(tempPackagesPath, 'sample-app', 'package.json'),
    )) as CoreProperties;
    expect(manifest.name).toBe('@scoped/sample-app');
  });

  it('fails if trying to add another app with the same name', async () => {
    let err = '';
    try {
      await addPackageForTests('@scoped/sample-app', 'app');
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toContain(`already exists and it's not empty`);
  });

  it('fails trying to add another app with the same name in another path', async () => {
    await expect(
      runModularForTestsAsync(
        tempModularRepo,
        'add @scoped/sample-app --unstable-type app --path packages/wont/happen',
      ),
    ).rejects.toThrow();
  });

  it('fails trying to add another app in the same path (as scope is discarded)', async () => {
    let err = '';
    try {
      await addPackageForTests('sample-app', 'app');
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toContain(`already exists and it's not empty`);
  });
});

describe('When working with an app installed in a custom directory', () => {
  beforeAll(() => {
    createTempModularRepoWithTemplate(appTemplatePath);
    setupMocks(tempModularRepo);
    runModularForTests(
      tempModularRepo,
      'add @scoped/sample-app --unstable-type app --path packages/nested/scoped',
    );
  });

  it('creates the app in the custom directory, with the expected name', async () => {
    const manifest = (await fs.readJSON(
      path.join(
        tempPackagesPath,
        'nested',
        'scoped',
        'sample-app',
        'package.json',
      ),
    )) as CoreProperties;
    expect(manifest.name).toBe('@scoped/sample-app');
  });

  it('fails if trying to add another app with the same name in the default path', async () => {
    await expect(
      addPackageForTests('@scoped/sample-app', 'app'),
    ).rejects.toThrow();
  });

  it('fails trying to add another app in the same path (as scope is discarded)', async () => {
    await expect(
      runModularForTestsAsync(
        tempModularRepo,
        'add sample-app --unstable-type app --path packages/nested/scoped',
      ),
    ).rejects.toThrow();
  });
});

describe('When adding a module from a template without a files filter', () => {
  let newModulePath: string;
  beforeAll(async () => {
    createTempModularRepoWithTemplate(noFilterTemplatePath);
    setupMocks(tempModularRepo);
    newModulePath = path.join(tempPackagesPath, 'no-filter-module');
    await addPackageForTests('no-filter-module', 'no-filter');
  });

  it('generates the package.json', async () => {
    // Expect name to be as set by command, and type as set by template
    expect(await fs.readJSON(path.join(newModulePath, 'package.json')))
      .toMatchInlineSnapshot(`
      {
        "modular": {
          "type": "app",
        },
        "name": "no-filter-module",
        "private": true,
        "version": "1.0.0",
      }
    `);
  });

  it("copies all files in the template's package.json files field", () => {
    expect(
      tree(newModulePath, {
        hashIgnores: ['CHANGELOG.md', 'package.json', 'tsconfig.json'],
      }),
    ).toMatchInlineSnapshot(`
      "no-filter-module
      ├─ CHANGELOG.md
      ├─ README.md #13oulez
      ├─ package.json
      ├─ public
      │  └─ robots.txt #1sjb8b3
      ├─ src
      │  ├─ __tests__
      │  │  └─ no-filter.test.ts #ez9wna
      │  └─ index.tsx #1woe74n
      └─ tsconfig.json"
    `);
  });
});

describe('When adding a module from a template with a files filter', () => {
  let newModulePath: string;
  beforeAll(async () => {
    createTempModularRepoWithTemplate(filterTemplatePath);
    setupMocks(tempModularRepo);
    newModulePath = path.join(tempPackagesPath, 'filter-module');
    await addPackageForTests('filter-module', 'filter');
  });

  it('generates the package.json', async () => {
    // Expect name to be as set by command, and type as set by template
    expect(await fs.readJson(path.join(newModulePath, 'package.json')))
      .toMatchInlineSnapshot(`
      {
        "modular": {
          "type": "app",
        },
        "name": "filter-module",
        "private": true,
        "version": "1.0.0",
      }
    `);
  });

  it("copies only files declared in the template's package.json files field, and the package.json itself", () => {
    expect(
      tree(newModulePath, {
        hashIgnores: ['CHANGELOG.md', 'package.json', 'tsconfig.json'],
      }),
    ).toMatchInlineSnapshot(`
      "filter-module
      ├─ README.md #13oulez
      ├─ package.json
      ├─ src
      │  ├─ __tests__
      │  │  └─ filter.test.ts #ez9wna
      │  └─ index.tsx #1woe74n
      └─ tsconfig.json"
    `);
  });
});

describe('When creating a new modular project', () => {
  beforeAll(() => {
    tempModularRepo = createModularTestContext();
  });
  describe('When adding a new app type workspace from template', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      await addPackageForTests('my-app', 'app');
    });
    it('succesfully runs tests', async () => {
      const { mockExit, err } = await runTestForTests({
        packages: ['my-app'],
      });
      expect(err).toBeUndefined();
      expect(mockExit).not.toHaveBeenCalled();
    });
  });
  describe('When adding a new package type workspace from template', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      await addPackageForTests('my-package', 'package');
    });
    it('succesfully runs tests', async () => {
      const { mockExit, err } = await runTestForTests({
        packages: ['my-package'],
      });
      expect(err).toBeUndefined();
      expect(mockExit).not.toHaveBeenCalled();
    });
  });
  describe('When adding a new esm-view type workspace from template', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      await addPackageForTests('my-esm-view', 'esm-view');
    });
    it('succesfully runs tests', async () => {
      const { mockExit, err } = await runTestForTests({
        packages: ['my-esm-view'],
      });
      expect(err).toBeUndefined();
      expect(mockExit).not.toHaveBeenCalled();
    });
  });
  describe('When adding a new view type workspace from template', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      await addPackageForTests('my-view', 'view');
    });
    it('succesfully runs tests', async () => {
      const { mockExit, err } = await runTestForTests({
        packages: ['my-view'],
      });
      expect(err).toBeUndefined();
      expect(mockExit).not.toHaveBeenCalled();
    });
  });
  describe('When adding a new source type workspace from template', () => {
    beforeAll(async () => {
      setupMocks(tempModularRepo);
      await addPackageForTests('my-source', 'source');
    });
    it('succesfully runs tests', async () => {
      const { mockExit, err } = await runTestForTests({
        packages: ['my-source'],
      });
      expect(err).toBeUndefined();
      expect(mockExit).not.toHaveBeenCalled();
    });
  });
});
