import execa from 'execa';
import rimraf from 'rimraf';
import path from 'path';
import fs from 'fs-extra';
import tree from 'tree-view-for-tests';

import getModularRoot from '../utils/getModularRoot';

import type { CoreProperties } from '@schemastore/package';
import { createModularTestContext, mockInstallTemplates } from '../test/utils';

const modularRoot = getModularRoot();

// Setup temporary test context
const tempModularRepo = createModularTestContext();
console.log(`Temp Modular Repo: ${tempModularRepo}`);
if (fs.existsSync(tempModularRepo)) {
  console.log('Exists');
}
const packagesPath = path.join(tempModularRepo, 'packages');

const templatesPath = path.join(modularRoot, '__fixtures__', 'templates');
mockInstallTemplates(templatesPath, tempModularRepo);

/**
 * Reset 'packages' workspace in temporary Modular Repo
 */
function cleanup() {
  rimraf.sync(packagesPath);
  fs.mkdirSync(packagesPath);
}

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('yarnpkg', ['modular', ...str.split(' '), '--verbose'], {
    cwd: modularRoot,
    cleanup: true,
    stdio: 'inherit',
    ...opts,
  });
}

describe('When setting a base directory for an app', () => {
  it('fails if trying to add an app outside the "workspaces" directories', async () => {
    await expect(
      modular(
        'add @scoped/will-not-create-app --path some/other/basepath --unstable-type app',
      ),
    ).rejects.toThrow();
  });
});

describe('When working with a scoped app', () => {
  beforeAll(async () => {
    await modular('add @scoped/sample-app --unstable-type app');
  });

  afterAll(cleanup);

  it('creates the app in the expected directory, with the expected name', async () => {
    const manifest = (await fs.readJSON(
      path.join(packagesPath, 'sample-app', 'package.json'),
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
    await modular(
      'add @scoped/sample-app --unstable-type app --path packages/nested/scoped',
    );
  });

  afterAll(cleanup);

  it('creates the app in the custom directory, with the expected name', async () => {
    const manifest = (await fs.readJSON(
      path.join(packagesPath, 'nested', 'scoped', 'sample-app', 'package.json'),
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
  const newModulePath = path.join(packagesPath, 'no-filter-module');
  beforeAll(async () => {
    await modular('add no-filter-module --template no-filter');
  });

  afterAll(cleanup);

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
  const newModulePath = path.join(packagesPath, 'filter-module');
  beforeAll(async () => {
    await modular('add filter-module --template filter');
  });

  afterAll(cleanup);

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
