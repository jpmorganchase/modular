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

const app = 'test-app';
const esbuildConfigFile = 'esbuild-config.js';
const webpackConfigFile = 'webpack-config.js';

describe('A modular repo with a root .modular.js config file', () => {
  beforeEach(() => {
    tempModularRepo = createModularTestContext();
    runModularForTests(tempModularRepo, `add ${app} --unstable-type app`);
    copyFileSync(
      path.join(configFixtures, esbuildConfigFile),
      path.join(tempModularRepo, '.modular.js'),
    );
  });
  it('builds using esbuild as specified in the root config file', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      `build ${app} --verbose`,
      'true',
    );
    expect(result.stdout).toContain('Building with esbuild');
    expect(result.exitCode).toBe(0);
    console.log(result.stdout);
  });
  it('builds using webpack if a package specific config gile overrides the root config', () => {
    copyFileSync(
      path.join(configFixtures, webpackConfigFile),
      path.join(tempModularRepo, 'packages', app, '.modular.js'),
    );
    const result = runModularPipeLogs(
      tempModularRepo,
      `build ${app} --verbose`,
      'true',
    );
    expect(result.stdout).toContain('Building with Webpack');
    expect(result.exitCode).toBe(0);
    console.log(result.stdout);
  });
  it('builds using webpack if the environment variable is provided as it overrides the config', () => {
    const result = runModularPipeLogs(
      tempModularRepo,
      `build ${app} --verbose`,
      'true',
      {
        env: {
          USE_MODULAR_ESBUILD: 'false',
        },
      },
    );
    expect(result.stdout).toContain('Building with Webpack');
    expect(result.exitCode).toBe(0);
    console.log(result.stdout);
  });
});
