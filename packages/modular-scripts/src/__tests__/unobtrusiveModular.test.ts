import path from 'path';
import execa from 'execa';
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

  it('does not build non-modular packages that are not buildable when selected directly, but does not fail', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'build non-modular-non-buildable-non-testable',
    );
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('No workspaces to build');
  });

  it('builds buildable non-modular packages when selected directly', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'build non-modular-buildable',
    );
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('\nnon-modular-buildable was built');
  });

  it('builds non-modular packages in dependency order', () => {
    const result = runModularPipeLogs(tempModularRepo, 'build --verbose');
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('\nnon-modular-buildable was built\n');
    expect(result.stdout).toContain(
      'Building the following workspaces in order: [["non-modular-buildable"],["app"]]',
    );
    expect(result.stdout).toContain('Compiled successfully.');
  });

  it('does not test non-modular packages that are not buildable when selected directly, but does not fail', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'test non-modular-non-buildable-non-testable',
    );
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('No workspaces found in selection');
  });

  it('tests testable non-modular packages when selected directly', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'test non-modular-testable --verbose',
    );
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain('Modular package targets for tests are []');
    expect(result.stdout).toContain(
      'Non-modular targets selected and eligible for tests are: ["non-modular-testable"]',
    );
    expect(result.stdout).toContain('Final regexes to pass to Jest are: []');

    expect(result.stdout).toContain('\nnon-modular-testable was tested');
  });

  it('lints non-modular packages', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'lint non-modular-lintable --verbose',
    );
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(
      'Running lint command in the following non-modular packages: ["non-modular-lintable"]',
    );
    expect(result.stdout).toContain('non-modular-lintable was linted');
  });

  it('typechecks non-modular packages', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      'typecheck non-modular-typecheckable --verbose',
    );
    expect(result.stderr).toBeFalsy();
    expect(result.stdout).toContain(
      'Running typecheck command in the following non-modular packages: ["non-modular-typecheckable"]',
    );
    expect(result.stdout).toContain(
      'non-modular-typecheckable was typechecked',
    );
  });
});
