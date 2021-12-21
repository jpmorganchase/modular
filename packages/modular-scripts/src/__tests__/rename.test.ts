import execa from 'execa';
import { promisify } from 'util';
import _rimraf from 'rimraf';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';

const rimraf = promisify(_rimraf);

const modularRoot = getModularRoot();

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd: modularRoot,
    cleanup: true,
    ...opts,
  });
}

async function cleanup() {
  const packagesPath = path.join(getModularRoot(), 'packages');

  await rimraf(path.join(packagesPath, 'sample-depending-package'));
  await rimraf(path.join(packagesPath, 'sample-library-package'));
  await rimraf(path.join(packagesPath, 'sample-library-renamed-package'));
  // run yarn so yarn.lock gets reset
  await execa('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

describe('Rename command', () => {
  beforeAll(async () => {
    await modular(
      'add sample-depending-package --unstable-type package --unstable-name sample-depending-package',
      {
        stdio: 'inherit',
      },
    );

    await modular(
      'add sample-library-package --unstable-type package --unstable-name sample-library-package',
      {
        stdio: 'inherit',
      },
    );

    const libraryPackageSrc = path.join(
      getModularRoot(),
      'packages',
      'sample-library-package',
      'src',
    );
    await fs.emptyDir(libraryPackageSrc);
    await fs.copy(
      path.join(
        __dirname,
        '__fixtures__',
        'packages',
        'sample-library-package',
      ),
      libraryPackageSrc,
    );

    const dependingPackageSrc = path.join(
      getModularRoot(),
      'packages',
      'sample-depending-package',
      'src',
    );
    await fs.emptyDir(dependingPackageSrc);
    await fs.copy(
      path.join(
        __dirname,
        '__fixtures__',
        'packages',
        'sample-depending-package',
      ),
      dependingPackageSrc,
    );
  });

  it('expects file importing the dependency to refer to the renamed dep', async () => {
    await modular(
      'rename sample-library-package sample-library-renamed-package',
      {
        stdio: 'inherit',
      },
    );

    expect(
      await fs.readFile(
        path.join(
          modularRoot,
          'packages',
          'sample-depending-package',
          'src',
          'App.tsx',
        ),
        'utf8',
      ),
    ).toMatchInlineSnapshot(`
      "import * as React from 'react';
      // @ts-ignore
      import summer from 'sample-library-renamed-package';

      declare function summer(a: number, b: number): number;
      function App(): JSX.Element {
        const result = summer(7, 7);
        return (
          <div className=\\"App\\">
            <header className=\\"App-header\\">
              <p>This is the result: {result}</p>
            </header>
          </div>
        );
      }

      export default App;
      "
    `);
  });
});
