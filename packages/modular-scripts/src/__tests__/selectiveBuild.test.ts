import execa from 'execa';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';
import { createModularTestContext, runLocalModular } from '../test/utils';

// Temporary test context paths set by createTempModularRepoWithTemplate()
let tempModularRepo: string;

const currentModularFolder = getModularRoot();

describe('--changed builds all the changed packages in order', () => {
  const fixturesFolder = path.join(
    getModularRoot(),
    '__fixtures__',
    'ghost-building',
  );

  beforeAll(() => {
    tempModularRepo = createModularTestContext();
    console.log(tempModularRepo);
    fs.copySync(fixturesFolder, tempModularRepo);

    // Create git repo & commit
    if (process.env.GIT_AUTHOR_NAME && process.env.GIT_AUTHOR_EMAIL) {
      execa.sync('git', [
        'config',
        '--global',
        'user.email',
        `"${process.env.GIT_AUTHOR_EMAIL}"`,
      ]);
      execa.sync('git', [
        'config',
        '--global',
        'user.name',
        `"${process.env.GIT_AUTHOR_NAME}"`,
      ]);
    }
    execa.sync('git', ['init'], {
      cwd: tempModularRepo,
    });

    execa.sync('yarn', {
      cwd: tempModularRepo,
    });

    execa.sync('git', ['add', '.'], {
      cwd: tempModularRepo,
    });

    execa.sync('git', ['commit', '-am', '"First commit"'], {
      cwd: tempModularRepo,
    });
  });

  it('builds nothing when everything committed', () => {
    const result = runLocalModular(currentModularFolder, tempModularRepo, [
      'build',
      '--changed',
    ]);
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('No changed workspaces found');
  });

  it('builds multiple packages', () => {
    const result = runLocalModular(currentModularFolder, tempModularRepo, [
      'build',
      'e',
      'a',
    ]);

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).not.toContain('building b');
    expect(result.stdout).not.toContain('building c');
    expect(result.stdout).toContain('building e');
    expect(result.stdout).toContain('building a');
    expect(result.stdout).not.toContain('building d');
  });

  it('builds a single package and its descendants', () => {
    const result = runLocalModular(currentModularFolder, tempModularRepo, [
      'build',
      'b',
      '--descendants',
    ]);

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('building b');
    expect(result.stdout).not.toContain('building e');
    expect(result.stdout).not.toContain('building a');
    expect(result.stdout).toContain('building d');
    expect(result.stdout).toContain('building c');
  });

  it('builds changed (uncommitted) packages', () => {
    fs.appendFileSync(
      path.join(tempModularRepo, '/packages/b/src/index.ts'),
      "\n// Comment to package b's source",
    );
    fs.appendFileSync(
      path.join(tempModularRepo, '/packages/c/src/index.ts'),
      "\n// Comment to package c's source",
    );

    const result = runLocalModular(currentModularFolder, tempModularRepo, [
      'build',
      '--changed',
    ]);

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('building b');
    expect(result.stdout).toContain('building c');
    expect(result.stdout).not.toContain('building a');
    expect(result.stdout).not.toContain('building d');
    expect(result.stdout).not.toContain('building e');
  });

  it('builds changed (uncommitted) packages + packages that are explicitly specified', () => {
    const result = runLocalModular(currentModularFolder, tempModularRepo, [
      'build',
      'e',
      '--changed',
    ]);

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('building b');
    expect(result.stdout).toContain('building c');
    expect(result.stdout).toContain('building e');
    expect(result.stdout).not.toContain('building a');
    expect(result.stdout).not.toContain('building d');
  });
});
