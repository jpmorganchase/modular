const execa = require('execa');
const rimraf = require('rimraf');
const path = require('path');

const modularRoot = path.join(__dirname, '../../../../');
const packagesPath = path.join(modularRoot, 'packages');

jest.setTimeout(3 * 60 * 1000);

async function transform() {
  return await execa(
    'babel',
    ['fixture.js', '--plugins', 'babel-plugin-macros'],
    { all: true, cwd: __dirname },
  );
}

async function modularAddView(name) {
  return await execa(
    'yarnpkg',
    `modular add ${name} --unstable-type=view`.split(' '),
    {
      cwd: modularRoot,
    },
  );
}

afterAll(async () => {
  rimraf.sync(path.join(packagesPath, 'view-1'));
  rimraf.sync(path.join(packagesPath, 'view-2'));
  // run yarn so yarn.lock gets reset
  await execa('yarnpkg', [], {
    cwd: modularRoot,
  });
});

it('outputs a plain object when no views are available', async () => {
  const output = await transform();
  expect(output.all).toMatchInlineSnapshot(`
    "console.log({});
    "
  `);
});

it('outputs a mapping of names to lazy components when views are available', async () => {
  await modularAddView('view-1');
  await modularAddView('view-2');

  const output = await transform();
  expect(output.all).toMatchInlineSnapshot(`
    "import { lazy as __lazy__ } from 'react';
    console.log({
      'view-1': __lazy__(() => import('view-1')),
      'view-2': __lazy__(() => import('view-2'))
    });
    "
  `);
});
