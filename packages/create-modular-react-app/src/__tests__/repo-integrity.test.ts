import createModularApp from '..';
import path from 'path';
import tmp from 'tmp';
import { runModular } from 'modular-scripts/src/test/utils';

describe('Newly created create-modular-react-app repo', () => {
  const repoName = 'test-integrity-cra-repo';
  let destination: string;
  let tmpDirectory: tmp.DirResult;
  beforeAll(async () => {
    tmpDirectory = tmp.dirSync({ unsafeCleanup: true });
    destination = path.join(tmpDirectory.name, repoName);
    await createModularApp({ name: destination });
  });

  afterAll(() => {
    //remove project
    tmpDirectory.removeCallback();
  });

  it('can build its default app with webpack without errors', async () => {
    const result = await runModular(destination, 'build app');
    expect(result.stdout).toContain('Compiled successfully.');
    expect(result.exitCode).toBe(0);
  });

  it('can build its default app with esbuild without errors', async () => {
    const result = await runModular(destination, `build app`, {
      env: {
        USE_MODULAR_ESBUILD: 'true',
      },
    });
    expect(result.stdout).toContain('is ready to be deployed');
    expect(result.exitCode).toBe(0);
  });

  it('can typecheck the repository without errors', async () => {
    const result = await runModular(destination, 'typecheck');
    expect(result.stdout).toContain('✓ Typecheck passed');
    expect(result.exitCode).toBe(0);
  });

  it('can run the default tests and succeed', async () => {
    const result = await runModular(destination, 'test --watchAll=false');
    expect(result.stderr).toContain('Test Suites: 1 passed, 1 total');
    expect(result.exitCode).toBe(0);
  });

  it('can lint-check the repository and succeed', async () => {
    const result = await runModular(destination, 'lint');
    expect(result.stderr).toContain('Test Suites: 4 passed, 4 total');
    expect(result.exitCode).toBe(0);
  });
});
