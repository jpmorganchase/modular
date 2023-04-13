import execa from 'execa';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';
import { createModularTestContext, runModularPipeLogs } from '../test/utils';

// Temporary test context paths set by createTempModularRepoWithTemplate()
let tempModularRepo: string;

const buildRegex = /building (\w)\.\.\./gm;

describe('--changed builds all the changed packages in order', () => {
  const fixturesFolder = path.join(
    getModularRoot(),
    '__fixtures__',
    'ghost-building',
  );

  beforeAll(() => {
    tempModularRepo = createModularTestContext();
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
    const result = runModularPipeLogs(tempModularRepo, 'build --changed');
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('No workspaces to build');
  });

  it('builds multiple packages', () => {
    const result = runModularPipeLogs(tempModularRepo, 'build e a');

    expect(result.stderr).toBeFalsy();
    expect(getBuildOrder(result.stdout)).toEqual(['a', 'e']);
  });

  it('builds a single package and its descendants', () => {
    const result = runModularPipeLogs(tempModularRepo, 'build b --descendants');

    expect(result.stderr).toBeFalsy();
    expect(getBuildOrder(result.stdout)).toEqual(['d', 'c', 'b']);
  });

  it('builds a single package and its ancestors', () => {
    const result = runModularPipeLogs(tempModularRepo, 'build b --ancestors');

    expect(result.stderr).toBeFalsy();
    expect(getBuildOrder(result.stdout)).toEqual(['b', 'a', 'e']);
  });

  it('builds multiple packages and their descendants', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'build d a --descendants',
    );

    expect(result.stderr).toBeFalsy();
    expect(getBuildOrder(result.stdout)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('builds multiple packages and their ancestors', () => {
    const result = runModularPipeLogs(tempModularRepo, 'build d a --ancestors');

    expect(result.stderr).toBeFalsy();
    expect(getBuildOrder(result.stdout)).toEqual(['d', 'c', 'b', 'a', 'e']);
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

    const result = runModularPipeLogs(tempModularRepo, 'build --changed');

    expect(result.stderr).toBeFalsy();
    expect(getBuildOrder(result.stdout)).toEqual(['c', 'b']);
  });

  it('builds changed (uncommitted) packages + packages that are explicitly specified', () => {
    const result = runModularPipeLogs(tempModularRepo, 'build e --changed');

    expect(result.stderr).toBeFalsy();
    expect(getBuildOrder(result.stdout)).toEqual(['c', 'b', 'e']);
  });

  it('builds changed (uncommitted) packages and their descendants', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'build --changed --descendants',
    );

    expect(result.stderr).toBeFalsy();
    expect(getBuildOrder(result.stdout)).toEqual(['d', 'c', 'b']);
  });

  it('builds changed (uncommitted) packages and their ancestors', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'build --changed --ancestors',
    );

    expect(result.stderr).toBeFalsy();
    expect(getBuildOrder(result.stdout)).toEqual(['c', 'b', 'a', 'e']);
  });

  it('builds all packages if invoked without arguments / selective options', () => {
    const result = runModularPipeLogs(tempModularRepo, 'build');

    expect(result.stderr).toBeFalsy();
    expect(getBuildOrder(result.stdout)).toEqual([
      'd',
      'c',
      'b',
      'a',
      'f',
      'e',
    ]);
  });

  it('builds packages concurrently with a certain concurrencyLevel', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'build --verbose --concurrencyLevel 2',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(
      'runBatch is running a batch of length 2: ["e","f"]',
    );
  });

  it('removes concurrency with concurrencyLevel = 0', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'build --verbose --concurrencyLevel 0',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).not.toContain(
      'runBatch is running a batch of length 2',
    );
    expect(result.stdout).toContain(
      'runBatch is running a batch of length 1: ["e"]',
    );
    expect(result.stdout).toContain(
      'runBatch is running a batch of length 1: ["f"]',
    );
  });

  it('removes concurrency with concurrencyLevel = 1', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'build --verbose --concurrencyLevel 0',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).not.toContain(
      'runBatch is running a batch of length 2',
    );
    expect(result.stdout).toContain(
      'runBatch is running a batch of length 1: ["e"]',
    );
    expect(result.stdout).toContain(
      'runBatch is running a batch of length 1: ["f"]',
    );
  });
});

function getBuildOrder(output: string) {
  return [...output.matchAll(buildRegex)].map(([, group]) => group);
}
