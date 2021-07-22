import execa from 'execa';
import * as path from 'path';
import * as rimraf from 'rimraf';

const modularRoot = path.join(__dirname, '../../../../');
const packagesPath = path.join(modularRoot, 'packages');

async function transform() {
  const result = await execa(
    'babel',
    ['fixture.js', '--plugins', 'babel-plugin-macros'],
    {
      cleanup: true,
      all: true,
      cwd: __dirname,
    },
  );
  return result.all;
}

async function modularAddView(name: string) {
  return await execa(
    'yarnpkg',
    `modular add ${name} --unstable-type view --unstable-name ${name}`.split(
      ' ',
    ),
    {
      cleanup: true,
      cwd: modularRoot,
      stderr: process.stderr,
      stdout: process.stdout,
    },
  );
}

beforeAll(async () => {
  await execa('yarnpkg', ['build'], {
    cleanup: true,
    cwd: path.join(__dirname, '..', '..'),
    stderr: process.stderr,
    stdout: process.stdout,
  });
});

afterAll(async () => {
  rimraf.sync(path.join(packagesPath, 'view-1'));
  rimraf.sync(path.join(packagesPath, 'view-2'));
  // run yarn so yarn.lock gets reset
  await execa('yarnpkg', [], {
    cwd: modularRoot,
    stderr: process.stderr,
    stdout: process.stdout,
  });
});

it('outputs a plain object when no views are available', async () => {
  const output = await transform();
  expect(output).toMatchInlineSnapshot(`
    "const __views__map__ = {};
    console.log(__views__map__);
    "
  `);
});

it('outputs a mapping of names to lazy components when views are available', async () => {
  await modularAddView('view-1');
  await modularAddView('view-2');

  const output = await transform();
  expect(output).toMatchInlineSnapshot(`
    "import { lazy as __lazy__ } from 'react';
    const __views__map__ = {
      'view-1': __lazy__(() => import('view-1')),
      'view-2': __lazy__(() => import('view-2'))
    };
    console.log(__views__map__);
    "
  `);
});
