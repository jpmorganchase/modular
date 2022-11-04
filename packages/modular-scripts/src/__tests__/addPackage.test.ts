import execa from 'execa';
import path from 'path';
import fs from 'fs-extra';
import tree from 'tree-view-for-tests';

import getModularRoot from '../utils/getModularRoot';

import type { CoreProperties } from '@schemastore/package';
import { createModularTestContext, mockInstallTemplate } from '../test/utils';

const modularRoot = getModularRoot();

// Template Paths
const templatesPath = path.join(modularRoot, '__fixtures__', 'templates');
const appTemplatePath = path.join(templatesPath, 'modular-template-app');
const filterTemplatePath = path.join(templatesPath, 'modular-template-filter');
const noFilterTemplatePath = path.join(
  templatesPath,
  'modular-template-no-filter',
);

// Temporary test context paths set by generateTempModularRepo
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

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd: tempModularRepo,
    cleanup: true,
    stdio: 'inherit',
    ...opts,
  });
}

describe('When setting a base directory for an app', () => {
  it('fails if trying to add an app outside the "workspaces" directories', async () => {
    createTempModularRepoWithTemplate(appTemplatePath);
    await expect(
      modular(
        'add @scoped/will-not-create-app --path some/other/basepath --unstable-type app',
      ),
    ).rejects.toThrow();
  });
});

describe('When working with a scoped app', () => {
  beforeAll(async () => {
    createTempModularRepoWithTemplate(appTemplatePath);
    await modular('add @scoped/sample-app --unstable-type app');
  });

  it('creates the app in the expected directory, with the expected name', async () => {
    const manifest = (await fs.readJSON(
      path.join(tempPackagesPath, 'sample-app', 'package.json'),
    )) as CoreProperties;
    expect(manifest.name).toEqual('@scoped/sample-app');
  });

  it('fails if trying to add another app with the same name', async () => {
    await expect(
      modular('add @scoped/sample-app --unstable-type app'),
    ).rejects.toThrow();
  });

  it('fails trying to add another app with the same name in another path', async () => {
    await expect(
      modular(
        'add @scoped/sample-app --unstable-type app --path packages/wont/happen',
      ),
    ).rejects.toThrow();
  });

  it('fails trying to add another app in the same path (as scope is discarded)', async () => {
    await expect(
      modular('add sample-app --unstable-type app'),
    ).rejects.toThrow();
  });
});

describe('When working with an app installed in a custom directory', () => {
  beforeAll(async () => {
    createTempModularRepoWithTemplate(appTemplatePath);
    await modular(
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
    expect(manifest.name).toEqual('@scoped/sample-app');
  });

  it('fails if trying to add another app with the same name in the default path', async () => {
    await expect(
      modular('add @scoped/sample-app --unstable-type app'),
    ).rejects.toThrow();
  });

  it('fails trying to add another app in the same path (as scope is discarded)', async () => {
    await expect(
      modular(
        'add sample-app --unstable-type app --path packages/nested/scoped',
      ),
    ).rejects.toThrow();
  });
});

describe('When adding a module from a template without a files filter', () => {
  let newModulePath: string;
  beforeAll(async () => {
    createTempModularRepoWithTemplate(noFilterTemplatePath);
    newModulePath = path.join(tempPackagesPath, 'no-filter-module');
    await modular('add no-filter-module --template no-filter');
  });

  it('generates the package.json', async () => {
    // Expect name to be as set by command, and type as set by template
    expect(await fs.readJSON(path.join(newModulePath, 'package.json')))
      .toMatchInlineSnapshot(`
      Object {
        "modular": Object {
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
    newModulePath = path.join(tempPackagesPath, 'filter-module');
    await modular('add filter-module --template filter');
  });

  it('generates the package.json', async () => {
    // Expect name to be as set by command, and type as set by template
    expect(await fs.readJson(path.join(newModulePath, 'package.json')))
      .toMatchInlineSnapshot(`
      Object {
        "modular": Object {
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
      ├─ package.json
      ├─ src
      │  ├─ __tests__
      │  │  └─ filter.test.ts #ez9wna
      │  └─ index.tsx #1woe74n
      └─ tsconfig.json"
    `);
  });
});
