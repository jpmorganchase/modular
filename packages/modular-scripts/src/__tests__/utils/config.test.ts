import { copyFileSync } from 'fs';
import path from 'path';
import {
  createModularTestContext,
  runModularPipeLogs,
  runModularForTests,
} from '../../test/utils';
import getModularRoot from '../../utils/getModularRoot';

const modularRoot = getModularRoot();
const configFixtures = path.join(modularRoot, '__fixtures__', 'test-config');

// Temporary test context paths set by createTempModularRepoWithTemplate()
let tempModularRepo: string;

describe('A simple modular repo with a .modular.js config file', () => {
  beforeEach(() => {
    tempModularRepo = createModularTestContext();
    runModularForTests(tempModularRepo, 'add test-app --unstable-type app');
    copyFileSync(
      path.join(configFixtures, '.modular.js'),
      path.join(tempModularRepo, '.modular.js'),
    );
  });
  it('builds using esbuild as specified in config file', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      `build test-app --verbose`,
      'true',
    );
    expect(result.stdout).toContain('Building with esbuild');
    expect(result.exitCode).toBe(0);
  });
  it('builds using webpack if the environment variable is provided as it overrides the config', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      `build test-app --verbose`,
      'true',
      {
        env: {
          USE_MODULAR_ESBUILD: 'false',
        },
      },
    );
    expect(result.stdout).toContain('Building with Webpack');
    expect(result.exitCode).toBe(0);
  });
});
