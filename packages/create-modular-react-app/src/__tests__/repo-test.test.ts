import createModularApp from '..';
import execa from 'execa';
import path from 'path';
import tmp from 'tmp';

function modular(str: string, cwd: string, opts: Record<string, unknown> = {}) {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd,
    cleanup: true,
    ...opts,
  });
}

describe('create-modular-react-app app build', () => {
  const repoName = 'test-test-cra-repo';
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

  it('should create a CMRA project that can run tests and succeed', async () => {
    const result = await modular('test --watchAll=false', destination, {
      stdio: 'inherit',
    });
    expect(result.exitCode).toBe(0);
  });
});
