import execa from 'execa';
import { promisify } from 'util';
import _rimraf from 'rimraf';
import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';

const rimraf = promisify(_rimraf);

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

async function cleanup() {
  await rimraf(path.join(packagesPath, 'sample-view'));
  await rimraf(path.join(modularRoot, 'dist/sample-view'));
  // run yarn so yarn.lock gets reset
  await execa('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

const targetedView = 'sample-view';

describe('modular-scripts', () => {
  beforeAll(async () => {
    await cleanup();

    await modular(
      'add sample-view --unstable-type view --unstable-name sample-view',
      { stdio: 'inherit' },
    );

    await fs.copyFile(
      path.join(__dirname, 'TestView.test-tsx'),
      path.join(packagesPath, targetedView, 'src', 'index.tsx'),
    );
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('Adds packages correctly', () => {
    it('can add a view', () => {
      expect(tree(path.join(packagesPath, 'sample-view')))
        .toMatchInlineSnapshot(`
        "sample-view
        ├─ README.md #11adaka
        ├─ package.json
        └─ src
           ├─ __tests__
           │  └─ index.test.tsx #slarlz
           └─ index.tsx #19kersg"
      `);
    });
  });

  describe('WHEN building a view', () => {
    beforeAll(async () => {
      await modular('build sample-view', {
        stdio: 'inherit',
      });
    });

    it('THEN outputs the correct package.json in the dist directory', async () => {
      expect(
        await fs.readJson(
          path.join(modularRoot, 'dist', 'sample-view', 'package.json'),
        ),
      ).toMatchInlineSnapshot(`
        Object {
          "bundledDependencies": Array [],
          "dependencies": Object {
            "react": "17.0.2",
          },
          "license": "UNLICENSED",
          "modular": Object {
            "type": "view",
          },
          "module": "static/js/index-IC6FL6E2.js",
          "name": "sample-view",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(modularRoot, 'dist', 'sample-view')))
        .toMatchInlineSnapshot(`
        "sample-view
        ├─ index.html #1o286v3
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #1atamnv
              ├─ index-IC6FL6E2.js #19sl0ps
              └─ index-IC6FL6E2.js.map #1sysx0b"
      `);
    });
  });

  it('can execute tests', async () => {
    const output = await modular(
      'test sample-view sample-nested-package --watchAll false',
      {
        all: true,
        reject: false,
        env: {
          CI: 'true',
        },
      },
    );

    // TODO: Passing CI=true *should* remove all the coloring stuff,
    // it's weird that it doesn't. To workaround it, I've manually
    // removed those tokens from the string for the snapshot test.
    // Open to suggestions/fixes.

    // eslint-disable-next-line no-control-regex
    const cleanedOutput = output.all?.replace(/|\[\d+./gm, '');

    expect(cleanedOutput).toContain(
      'PASS test packages/sample-view/src/__tests__/index.test.tsx',
    );
  });
});
