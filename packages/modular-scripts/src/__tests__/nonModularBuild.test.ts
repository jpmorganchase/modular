import execa from 'execa';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';
import { createModularTestContext, runModularPipeLogs } from '../test/utils';

// Temporary test context paths set by createTempModularRepoWithTemplate()
let tempModularRepo: string;

describe('When there is a non-Modular package with a build script', () => {
  const fixturesFolder = path.join(
    getModularRoot(),
    '__fixtures__',
    'non-modular',
  );

  beforeAll(() => {
    tempModularRepo = createModularTestContext();
    fs.copySync(fixturesFolder, tempModularRepo);
    execa.sync('yarn', {
      cwd: tempModularRepo,
    });
  });

  it('builds non-modular packages in dependency order', () => {
    const result = runModularPipeLogs(tempModularRepo, 'build --verbose');
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('\nnon-modular-buildable was built\n');
    expect(result.stdout).toContain(
      'Building the following workspaces in order: ["non-modular-buildable","app"]',
    );
    expect(result.stdout).toContain('Compiled successfully.');
  });
});
