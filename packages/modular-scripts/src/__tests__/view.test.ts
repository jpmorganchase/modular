import execa from 'execa';
import { promisify } from 'util';
import _rimraf from 'rimraf';
import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';
import * as tmp from 'tmp';

import getModularRoot from '../utils/getModularRoot';
import type { ModularPackageJson } from '../utils/isModularType';

const mktempd = promisify(tmp.dir);

const rimraf = promisify(_rimraf);

const modularRoot = getModularRoot();

// const indexTemplate = `
//   import * as React from 'react';
//   import get from 'lodash/get';
//   import merge from 'lodash.merge';
//   import { difference } from 'lodash';
//   import Component from './Component';

//   export default function SampleView(): JSX.Element {
//     return (
//       <div>
//         <pre>{{ get, merge, difference }}</pre>
//         <Component />
//       </div>
//     );
//   }
// `;
// const ComponentTemplate = `
//   import * as React from 'react';

//   export default function Component(): JSX.Element {
//     const [value, setValue] = React.useState<string>('');
//     return (
//       <>
//         <div>This is an imported component</div>
//         <input value={value} onChange={(e) => setValue(e.target.value)} />
//       </>
//     );
//   }
// `;

const rootDependencies = {
  react: '17.0.2',
  'react-dom': '17.0.2',
};

const viewDependencies = {
  lodash: '4.17.21',
  'lodash.merge': '4.6.2',
};

const browserList = {
  production: ['>0.2%', 'not dead', 'not op_mini all'],
  development: [
    'last 1 chrome version',
    'last 1 firefox version',
    'last 1 safari version',
  ],
};

// These tests must be executed sequentially with `--runInBand`.

const modularBin = path.join(
  getModularRoot(),
  'node_modules',
  '.bin',
  'modular',
);

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('node', [modularBin, ...str.split(' ')], {
    cwd: modularRoot,
    cleanup: true,
    ...opts,
  });
}

const targetedView = 'sample-view';

describe('modular-scripts', () => {
  let externalModularRoot: string;
  let packagesPath: string;

  beforeAll(async () => {
    externalModularRoot = await mktempd();
    packagesPath = path.join(externalModularRoot, 'packages');

    console.log({ viewFolder: externalModularRoot });

    await modular('init -y', { stdio: 'inherit', cwd: externalModularRoot });

    await modular(
      `add sample-view --unstable-type view --unstable-name ${targetedView}`,
      { stdio: 'inherit', cwd: externalModularRoot },
    );

    // await fs.copyFile(
    //   path.join(__dirname, 'TestView.test-tsx'),
    //   path.join(packagesPath, targetedView, 'src', 'index.tsx'),
    // );
  });

  afterAll(async () => {
    await rimraf(externalModularRoot);
  });

  describe('Adds packages correctly', () => {
    it('can add a view', () => {
      expect(tree(path.join(packagesPath, targetedView)))
        .toMatchInlineSnapshot(`
        "sample-view
        ├─ README.md #11adaka
        ├─ package.json
        └─ src
           ├─ __tests__
           │  └─ index.test.tsx #slarlz
           └─ index.tsx #fxrie0"
      `);
    });
  });

  describe('WHEN building a view', () => {
    beforeAll(async () => {
      const rootPackagePath = path.join(externalModularRoot, 'package.json');
      const rootPackage = (await fs.readJson(
        rootPackagePath,
      )) as ModularPackageJson;
      rootPackage.dependencies = rootDependencies;
      rootPackage.browserslist = browserList;
      await fs.writeJSON(rootPackagePath, rootPackage);

      const viewPackagePath = path.join(
        externalModularRoot,
        'packages',
        targetedView,
        'package.json',
      );
      const viewPackage = (await fs.readJson(
        viewPackagePath,
      )) as ModularPackageJson;
      viewPackage.dependencies = viewDependencies;
      viewPackage.browserslist = browserList;
      await fs.writeJSON(viewPackagePath, viewPackage);

      await modular(`build ${targetedView}`, {
        stdio: 'inherit',
        cwd: externalModularRoot,
      });
    });

    it('THEN outputs the correct package.json in the dist directory', async () => {
      expect(
        await fs.readJson(
          path.join(externalModularRoot, 'dist', targetedView, 'package.json'),
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
          "module": "static/js/index-VDPJS2HT.js",
          "name": "sample-view",
          "version": "1.0.0",
        }
      `);
    });

    it('THEN outputs the correct directory structure', () => {
      expect(tree(path.join(externalModularRoot, 'dist', targetedView)))
        .toMatchInlineSnapshot(`
        "sample-view
        ├─ index.html #bkg3iv
        ├─ package.json
        └─ static
           └─ js
              ├─ _trampoline.js #rllvqg
              ├─ index-VDPJS2HT.js #18o4dre
              └─ index-VDPJS2HT.js.map #1hoe7wo"
      `);
    });
  });
});
