import execa from 'execa';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';
import { createModularTestContext, runModularPipeLogs } from '../test/utils';
import { runSelectForTests, setupMocks } from '../test/mockFunctions';

// Temporary test context paths set by createTempModularRepoWithTemplate()
let tempModularRepo: string;

describe('select', () => {
  const fixturesFolder = path.join(
    getModularRoot(),
    '__fixtures__',
    'ghost-building',
  );

  beforeAll(() => {
    tempModularRepo = createModularTestContext();
    setupMocks(tempModularRepo);
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

  it('selects nothing when everything committed', () => {
    // RunSelectForTests doesn't work with git related things when using --changed
    const result = runModularPipeLogs(tempModularRepo, 'select --changed');
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([]));
  });

  it('selects multiple packages in select order', async () => {
    const { stdout, stderr } = await runSelectForTests({
      selectedPackages: ['e', 'a'],
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(format(['e', 'a']));
  });

  it('selects a single package and its descendants', async () => {
    const { stdout, stderr } = await runSelectForTests({
      selectedPackages: ['b'],
      descendants: true,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(format(['b', 'c', 'd']));
  });

  it('selects a single package and its ancestors', async () => {
    const { stdout, stderr } = await runSelectForTests({
      selectedPackages: ['b'],
      ancestors: true,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(format(['b', 'a', 'e']));
  });

  it('selects multiple packages and their descendants', async () => {
    const { stdout, stderr } = await runSelectForTests({
      selectedPackages: ['d', 'a'],
      descendants: true,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(format(['d', 'a', 'b', 'c']));
  });

  it('selects multiple packages and their ancestors', async () => {
    const { stdout, stderr } = await runSelectForTests({
      selectedPackages: ['d', 'a'],
      ancestors: true,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(format(['d', 'a', 'c', 'e', 'b']));
  });

  it('selects changed (uncommitted) packages', () => {
    fs.appendFileSync(
      path.join(tempModularRepo, '/packages/b/src/index.ts'),
      "\n// Comment to package b's source",
    );
    fs.appendFileSync(
      path.join(tempModularRepo, '/packages/c/src/index.ts'),
      "\n// Comment to package c's source",
    );

    // RunSelectForTests doesn't work with git related things when using --changed
    const result = runModularPipeLogs(tempModularRepo, 'select --changed');

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['b', 'c']));
  });

  it('selects changed (uncommitted) packages + packages that are explicitly specified', () => {
    // RunSelectForTests doesn't work with git related things when using --changed
    const result = runModularPipeLogs(tempModularRepo, 'select e --changed');

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['e', 'b', 'c']));
  });

  it('selects changed (uncommitted) packages and their descendants', () => {
    // RunSelectForTests doesn't work with git related things when using --changed
    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --descendants',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['b', 'c', 'd']));
  });

  it('selects changed (uncommitted) packages and their ancestors', () => {
    // RunSelectForTests doesn't work with git related things when using --changed
    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --ancestors',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['b', 'c', 'a', 'e']));
  });

  it('selects all packages if invoked without arguments / selective options', async () => {
    const { stdout, stderr } = await runSelectForTests({});

    expect(stderr).toBe('');
    expect(stdout).toContain(format(['a', 'b', 'c', 'd', 'e', 'f']));
  });
});

describe('select in buildable order', () => {
  const fixturesFolder = path.join(
    getModularRoot(),
    '__fixtures__',
    'ghost-building',
  );

  beforeAll(() => {
    tempModularRepo = createModularTestContext();
    setupMocks(tempModularRepo);
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

  // RunSelectForTests doesn't work with git related things when using --changed
  it('selects nothing when everything committed', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --buildable',
    );
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([]));
  });

  it('selects multiple packages in select order', async () => {
    const { stdout, stderr } = await runSelectForTests({
      selectedPackages: ['e', 'a'],
      buildable: true,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(format([['a'], ['e']]));
  });

  it('selects a single package and its descendants', async () => {
    const { stdout, stderr } = await runSelectForTests({
      selectedPackages: ['b'],
      descendants: true,
      buildable: true,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(format([['d'], ['c'], ['b']]));
  });

  it('selects a single package and its ancestors', async () => {
    const { stdout, stderr } = await runSelectForTests({
      selectedPackages: ['b'],
      ancestors: true,
      buildable: true,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(format([['b'], ['a'], ['e']]));
  });

  it('selects multiple packages and their descendants', async () => {
    const { stdout, stderr } = await runSelectForTests({
      selectedPackages: ['d', 'a'],
      descendants: true,
      buildable: true,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(format([['d'], ['c'], ['b'], ['a']]));
  });

  it('selects multiple packages and their ancestors', async () => {
    const { stdout, stderr } = await runSelectForTests({
      selectedPackages: ['d', 'a'],
      ancestors: true,
      buildable: true,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(format([['d'], ['c'], ['b'], ['a'], ['e']]));
  });

  it('selects changed (uncommitted) packages', () => {
    fs.appendFileSync(
      path.join(tempModularRepo, '/packages/b/src/index.ts'),
      "\n// Comment to package b's source",
    );
    fs.appendFileSync(
      path.join(tempModularRepo, '/packages/c/src/index.ts'),
      "\n// Comment to package c's source",
    );

    // RunSelectForTests doesn't work with git related things when using --changed
    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --buildable',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([['c'], ['b']]));
  });

  // RunSelectForTests doesn't work with git related things when using --changed\
  it('selects changed (uncommitted) packages and their descendants', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --descendants --buildable',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([['d'], ['c'], ['b']]));
  });

  // RunSelectForTests doesn't work with git related things when using --changed
  it('selects changed (uncommitted) packages and their ancestors', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --ancestors --buildable',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([['c'], ['b'], ['a'], ['e']]));
  });

  it('selects all packages if invoked without arguments / selective options', async () => {
    const { stdout, stderr } = await runSelectForTests({
      buildable: true,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(format([['d'], ['c'], ['b'], ['a'], ['e', 'f']]));
  });
});

function format(u: unknown) {
  return JSON.stringify(u, null, 2);
}
