import execa from 'execa';
import { copyFileSync } from 'fs';
import path from 'path';
import { createModularTestContext } from '../../test/utils';
import getModularRoot from '../../utils/getModularRoot';

const modularRoot = getModularRoot();
const configFixtures = path.join(modularRoot, '__fixtures__', 'test-config');

/**
 * Run modular with provided arguments in specified directory
 */
function modular(
  args: string,
  cwd: string,
  opts: Record<string, unknown> = {},
) {
  return execa('yarnpkg', ['modular', ...args.split(' ')], {
    cwd,
    cleanup: true,
    ...opts,
  });
}

// Temporary test context paths set by createTempModularRepoWithTemplate()
let tempModularRepo: string;

describe('A simple modular repo with a .modular.js config file', () => {
  beforeEach(async () => {
    tempModularRepo = createModularTestContext();
    await modular('add test-app --unstable-type app', tempModularRepo);
    copyFileSync(
      path.join(configFixtures, '.modular.js'),
      path.join(tempModularRepo, '.modular.js'),
    );
  });
  it('builds using esbuild as specified in config file', async () => {
    const result = await modular(`build test-app --verbose`, tempModularRepo);
    expect(result.stdout).toContain('Building with esbuild');
    expect(result.exitCode).toBe(0);
  });
  it('builds using webpack if the environment variable is provided as it overrides the config', async () => {
    const result = await modular(`build test-app --verbose`, tempModularRepo, {
      env: {
        USE_MODULAR_ESBUILD: 'false',
      },
    });
    expect(result.stdout).toContain('Building with Webpack');
    expect(result.exitCode).toBe(0);
  });
});
