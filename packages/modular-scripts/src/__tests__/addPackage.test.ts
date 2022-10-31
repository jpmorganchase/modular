import execa from 'execa';
import rimraf from 'rimraf';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';

import type { CoreProperties } from '@schemastore/package';
import getAllFiles from '../utils/getAllFiles';
import { createModularTestContext } from '../test/utils';

const modularRoot = getModularRoot();

const templatesPath = path.join(modularRoot, '__fixtures__', 'templates');

// Copy app template needed for tests to fixtures
fs.copySync(
  path.join(modularRoot, 'packages', 'modular-template-app'),
  path.join(templatesPath, 'modular-template-app'),
);

const tempModularRepo = createModularTestContext(templatesPath);
const packagesPath = path.join(tempModularRepo, 'packages');

/**
 * Reset 'packages' workspace in temporary Modular Repo
 */
function cleanup() {
  rimraf.sync(packagesPath);
  fs.mkdirSync(packagesPath);
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
    const manifest = (await fs.readJSON(
      path.join(newModulePath, 'package.json'),
    )) as CoreProperties;

    // Expect name to be as set by command, and type as set by template
    expect(JSON.stringify(manifest, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"name\\": \\"no-filter-module\\",
        \\"private\\": true,
        \\"modular\\": {
          \\"type\\": \\"app\\"
        },
        \\"version\\": \\"1.0.0\\"
      }"
    `);
  });

  it("copies all files in the template's package.json files field", () => {
    let files = getAllFiles(newModulePath);
    files = files.map((file) => file.substring(file.lastIndexOf('/')));
    expect(files).toMatchInlineSnapshot(`
      Array [
        "/CHANGELOG.md",
        "/package.json",
        "/robots.txt",
        "/no-filter.test.ts",
        "/index.tsx",
        "/tsconfig.json",
      ]
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
    const manifest = (await fs.readJSON(
      path.join(newModulePath, 'package.json'),
    )) as CoreProperties;

    // Expect name to be as set by command, and type as set by template
    expect(JSON.stringify(manifest, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"name\\": \\"filter-module\\",
        \\"private\\": true,
        \\"modular\\": {
          \\"type\\": \\"app\\"
        },
        \\"version\\": \\"1.0.0\\"
      }"
    `);
  });

  it("copies only files declared in the template's package.json files field, and the package.json itself", () => {
    let files = getAllFiles(newModulePath);
    files = files.map((file) => file.substring(file.lastIndexOf('/')));
    expect(files).toMatchInlineSnapshot(`
      Array [
        "/package.json",
        "/filter.test.ts",
        "/index.tsx",
        "/tsconfig.json",
      ]
    `);
  });
});
