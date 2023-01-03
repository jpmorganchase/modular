import execa from 'execa';
import path from 'path';
import fs from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';
import { createModularTestContext, runLocalModular } from '../test/utils';

// Temporary test context paths set by createTempModularRepoWithTemplate()
let tempModularRepo: string;

const currentModularFolder = getModularRoot();

describe('source types and circular dependencies', () => {
  const fixturesFolder = path.join(
    getModularRoot(),
    '__fixtures__',
    'source-type',
  );

  beforeAll(() => {
    tempModularRepo = createModularTestContext();
    fs.copySync(fixturesFolder, tempModularRepo);
    execa.sync('yarn', {
      cwd: tempModularRepo,
    });
    execa.sync('git', ['init'], {
      cwd: tempModularRepo,
    });
  });

  it('when building a source type, command succeeds but nothing is built', () => {
    const result = runLocalModular(currentModularFolder, tempModularRepo, [
      'build',
      'd',
    ]);
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('No workspaces to build');
  });

  it('when building a package that has a circular dependency, command fails', () => {
    expect(() =>
      runLocalModular(currentModularFolder, tempModularRepo, ['build', 'b']),
    ).toThrow('Cycle detected, b -> c -> b');
  });

  it('when building a package that has a circular dependency with the --dangerouslyIgnoreCircularDependencies flag set, command warns and succeeds if removing the source package from the graph removes the cycle', () => {
    const result = runLocalModular(currentModularFolder, tempModularRepo, [
      'build',
      'b',
      '--dangerouslyIgnoreCircularDependencies',
    ]);

    expect(result.stderr).toContain(
      'You chose to dangerously ignore cycles in the dependency graph',
    );
    expect(result.stdout).toContain('built b in');
  });

  it('when building a package that has a circular dependency with the --dangerouslyIgnoreCircularDependencies flag set, command still fails if removing the source package from the graph does not remove the cycle', () => {
    expect(() =>
      runLocalModular(currentModularFolder, tempModularRepo, [
        'build',
        'a',
        '--dangerouslyIgnoreCircularDependencies',
      ]),
    ).toThrow('Cycle detected, e -> a -> e');
  });
});
