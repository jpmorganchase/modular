import execa from 'execa';
import rimraf from 'rimraf';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';

import type { CoreProperties } from '@schemastore/package';
import getAllFiles from '../utils/getAllFiles';

const modularRoot = getModularRoot();
const tempTemplatePath = path.join(modularRoot, 'packages', 'template');
const tempPackagePath = path.join(modularRoot, 'packages', 'package');

// These tests must be executed sequentially with `--runInBand`.

const packagesPath = path.join(getModularRoot(), 'packages');
const templatesPath = path.join(modularRoot, '__fixtures__', 'templates');

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd: modularRoot,
    cleanup: true,
    ...opts,
  });
}

function cleanup() {
  rimraf.sync(path.join(packagesPath, 'sample-app'));
  rimraf.sync(path.join(packagesPath, 'nested'));
  rimraf.sync(tempTemplatePath);
  rimraf.sync(tempPackagePath);

  // run yarn so yarn.lock gets reset
  return execa.sync('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('When setting a base directory for an app', () => {
  it('fails if trying to add an app outside the "workspaces" directories', async () => {
    await expect(
      modular(
        'add @scoped/will-not-create-app --path some/other/basepath --unstable-type app',
        {
          stdio: 'inherit',
        },
      ),
    ).rejects.toThrow();
  });
});

describe('When working with a scoped app', () => {
  beforeAll(async () => {
    await modular('add @scoped/sample-app --unstable-type app', {
      stdio: 'inherit',
    });
  });

  afterAll(cleanup);

  it('creates the app in the expected directory, with the expected name', async () => {
    const manifest = (await fs.readJSON(
      path.join(modularRoot, 'packages', 'sample-app', 'package.json'),
    )) as CoreProperties;
    expect(manifest.name).toEqual('@scoped/sample-app');
  });

  it('fails if trying to add another app with the same name', async () => {
    await expect(
      modular('add @scoped/sample-app --unstable-type app', {
        stdio: 'inherit',
      }),
    ).rejects.toThrow();
  });

  it('fails trying to add another app with the same name in another path', async () => {
    await expect(
      modular(
        'add @scoped/sample-app --unstable-type app --path packages/wont/happen',
        {
          stdio: 'inherit',
        },
      ),
    ).rejects.toThrow();
  });

  it('fails trying to add another app in the same path (as scope is discarded)', async () => {
    await expect(
      modular('add sample-app --unstable-type app', {
        stdio: 'inherit',
      }),
    ).rejects.toThrow();
  });
});

describe('When working with an app installed in a custom directory', () => {
  beforeAll(async () => {
    await modular(
      'add @scoped/sample-app --unstable-type app --path packages/nested/scoped',
      {
        stdio: 'inherit',
      },
    );
  });

  afterAll(cleanup);

  it('creates the app in the custom directory, with the expected name', async () => {
    const manifest = (await fs.readJSON(
      path.join(
        modularRoot,
        'packages',
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
      modular('add @scoped/sample-app --unstable-type app', {
        stdio: 'inherit',
      }),
    ).rejects.toThrow();
  });

  it('fails trying to add another app in the same path (as scope is discarded)', async () => {
    await expect(
      modular(
        'add sample-app --unstable-type app --path packages/nested/scoped',
        {
          stdio: 'inherit',
        },
      ),
    ).rejects.toThrow();
  });

  describe('When adding a module from a template without files filter', () => {
    beforeAll(async () => {
      // Copy into the workspace the template needed for the test
      await fs.copy(
        path.join(templatesPath, 'modular-template-no-filter'),
        path.join(tempTemplatePath),
        { overwrite: true },
      );

      // Run yarnpkg to update workspace so that it picks up the template
      await execa('yarnpkg', { cwd: modularRoot, cleanup: true });

      await execa(
        'yarnpkg',
        ['modular', 'add', 'package', '--template', 'no-filter'],
        { cwd: modularRoot, cleanup: true },
      );
    });

    afterAll(cleanup);

    it('generates the package.json', async () => {
      const manifest = (await fs.readJSON(
        path.join(tempPackagePath, 'package.json'),
      )) as CoreProperties;
      expect(JSON.stringify(manifest, null, 2)).toMatchInlineSnapshot(`
        "{
          \\"name\\": \\"package\\",
          \\"private\\": true,
          \\"modular\\": {
            \\"type\\": \\"app\\"
          },
          \\"version\\": \\"1.0.0\\"
        }"
      `);
    });

    it('copies all files declared in the template', () => {
      let files = getAllFiles(path.join(tempPackagePath));
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

  describe('When adding a module from a template with files filter', () => {
    beforeAll(async () => {
      // Copy into the workspace the template needed for the test
      await fs.copy(
        path.join(templatesPath, 'modular-template-filter'),
        path.join(tempTemplatePath),
        { overwrite: true },
      );

      // Run yarnpkg to update workspace so that it picks up the template
      await execa('yarnpkg', { cwd: modularRoot, cleanup: true });

      await execa(
        'yarnpkg',
        ['modular', 'add', 'package', '--template', 'filter'],
        { cwd: modularRoot, cleanup: true },
      );
    });

    afterAll(cleanup);

    it('generates the package.json', async () => {
      const manifest = (await fs.readJSON(
        path.join(tempPackagePath, 'package.json'),
      )) as CoreProperties;
      expect(JSON.stringify(manifest, null, 2)).toMatchInlineSnapshot(`
        "{
          \\"name\\": \\"package\\",
          \\"private\\": true,
          \\"modular\\": {
            \\"type\\": \\"app\\"
          },
          \\"version\\": \\"1.0.0\\"
        }"
      `);
    });

    it("copies all files declared in the template's package.json files field", () => {
      let files = getAllFiles(path.join(tempPackagePath));
      files = files.map((file) => file.substring(file.lastIndexOf('/')));
      expect(files).toMatchInlineSnapshot(`
        Array [
          "/package.json",
          "/no-filter.test.ts",
          "/index.tsx",
          "/tsconfig.json",
        ]
      `);
    });
  });
});
