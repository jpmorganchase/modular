// DO NOT COMMIT - Just a quick test that's easy to run
import {
  runModularForTests,
  createModularTestContext,
  runModularPipeLogs,
} from '../test/utils';

describe('WHEN building with webpack', () => {
  const packageName = 'app';
  const tempModularRepo = createModularTestContext();

  beforeAll(() => {
    runModularForTests(tempModularRepo, `add ${packageName} --template app`);
  });

  it('THEN expects no errors', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      `build ${packageName} --verbose`,
    );
    expect(result.stdout).toContain('Building with Webpack');
    expect(result.exitCode).toBe(0);
  });
});
