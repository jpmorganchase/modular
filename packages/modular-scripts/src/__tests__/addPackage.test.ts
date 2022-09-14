import execa from 'execa';
import rimraf from 'rimraf';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';

import type { CoreProperties } from '@schemastore/package';

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
  rimraf.sync(path.join(packagesPath, 'sample-app'));
  rimraf.sync(path.join(packagesPath, 'nested', 'scoped'));

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
});
