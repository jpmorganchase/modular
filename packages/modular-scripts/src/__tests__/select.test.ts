import execa from 'execa';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';
import { createModularTestContext, runModularPipeLogs } from '../test/utils';

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
    const result = runModularPipeLogs(tempModularRepo, 'select --changed');
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([]));
  });

  it('selects multiple packages', () => {
    const result = runModularPipeLogs(tempModularRepo, 'select e a');

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['e', 'a']));
  });

  it('selects multiple packages in select order', () => {
    const result = runModularPipeLogs(tempModularRepo, 'select e a');

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['e', 'a']));
  });

  it('selects a single package and its descendants', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select b --descendants',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['b', 'c', 'd']));
  });

  it('selects a single package and its ancestors', () => {
    const result = runModularPipeLogs(tempModularRepo, 'select b --ancestors');

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['b', 'a', 'e']));
  });

  it('selects multiple packages and their descendants', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select d a --descendants',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['d', 'a', 'b', 'c']));
  });

  it('selects multiple packages and their ancestors', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select d a --ancestors',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['d', 'a', 'c', 'e', 'b']));
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

    const result = runModularPipeLogs(tempModularRepo, 'select --changed');

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['b', 'c']));
  });

  it('selects changed (uncommitted) packages + packages that are explicitly specified', () => {
    const result = runModularPipeLogs(tempModularRepo, 'select e --changed');

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['e', 'b', 'c']));
  });

  it('selects changed (uncommitted) packages and their descendants', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --descendants',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['b', 'c', 'd']));
  });

  it('selects changed (uncommitted) packages and their ancestors', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --ancestors',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['b', 'c', 'a', 'e']));
  });

  it('selects all packages if invoked without arguments / selective options', () => {
    const result = runModularPipeLogs(tempModularRepo, 'select');

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format(['a', 'b', 'c', 'd', 'e']));
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
    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --buildable',
    );
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([]));
  });

  it('selects multiple packages in select order', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select e a --buildable',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([['a'], ['e']]));
  });

  it('selects a single package and its descendants', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select b --descendants --buildable',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([['d'], ['c'], ['b']]));
  });

  it('selects a single package and its ancestors', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select b --ancestors --buildable',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([['b'], ['a'], ['e']]));
  });

  it('selects multiple packages and their descendants', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select d a --descendants --buildable',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([['d'], ['c'], ['b'], ['a']]));
  });

  it('selects multiple packages and their ancestors', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select d a --ancestors --buildable',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(
      format([['d'], ['c'], ['b'], ['a'], ['e']]),
    );
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

    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --buildable',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([['c'], ['b']]));
  });

  it('selects changed (uncommitted) packages and their descendants', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --descendants --buildable',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([['d'], ['c'], ['b']]));
  });

  it('selects changed (uncommitted) packages and their ancestors', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'select --changed --ancestors --buildable',
    );

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(format([['c'], ['b'], ['a'], ['e']]));
  });

  it('selects all packages if invoked without arguments / selective options', () => {
    const result = runModularPipeLogs(tempModularRepo, 'select --buildable');

    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(
      format([['d'], ['c'], ['b'], ['a'], ['e']]),
    );
  });
});

function format(u: unknown) {
  return JSON.stringify(u, null, 2);
}
