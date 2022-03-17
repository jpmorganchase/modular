import fs from 'fs-extra';
import path from 'path';

import { addFixturePackage, cleanup, modular } from '../test/utils';
import getModularRoot from '../utils/getModularRoot';

const modularRoot = getModularRoot();

describe('Rename command', () => {
  const libraryPackage = 'sample-renamable-library-package';
  const renamedPackage = 'sample-renamed-library-package';
  const dependentPackage = 'sample-renamable-depending-package';

  beforeAll(async () => {
    await cleanup([dependentPackage, libraryPackage, renamedPackage]);
    await addFixturePackage(libraryPackage, { copy: false });
    await addFixturePackage(dependentPackage, { copy: false });

    // For now, we have to write the index.ts file here because if we store it
    // as a fixture, the fixture itself will be renamed during our test
    await fs.writeFile(
      path.join(modularRoot, 'packages', dependentPackage, 'src', 'index.ts'),
      `/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// @ts-ignore
import add from '${libraryPackage}';

export function double(x: number): number {
  return add(x, x);
}
`,
    );
  });

  afterAll(
    async () =>
      await cleanup([dependentPackage, libraryPackage, renamedPackage]),
  );

  it('expects file importing the dependency to refer to the renamed dep', async () => {
    await modular(`rename ${libraryPackage} ${renamedPackage}`, {
      stdio: 'inherit',
    });

    const snapshot = `
      "/* eslint-disable @typescript-eslint/no-unsafe-call */
      /* eslint-disable @typescript-eslint/no-unsafe-return */
      // @ts-ignore
      import add from '${renamedPackage}';
      
      export function double(x: number): number {
        return add(x, x);
      }
      "
    `;

    expect(
      await fs.readFile(
        path.join(modularRoot, 'packages', dependentPackage, 'src', 'index.ts'),
        'utf8',
      ),
    ).toMatchInlineSnapshot(snapshot);
  });
});
