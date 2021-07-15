import * as path from 'path';
import { resolveAsBin } from './utils/resolve-as-bin';
import execSync from './utils/execSync';
import getModularRoot from './utils/getModularRoot';
import { getChangedFiles } from './utils/gitActions';

export async function lint(): Promise<void> {
  const modularRoot = getModularRoot();
  const changedFiles = getChangedFiles();

  const lintExtensions = ['.ts', '.tsx', '.js', '.jsx'];

  const testMatch = changedFiles
    .filter((p) => lintExtensions.includes(path.extname(p)))
    .map((p) => `<rootDir>/${p}`);

  const jestEslintConfig = {
    runner: 'jest-runner-eslint',
    watchPlugins: ['jest-runner-eslint/watch-fix'],
    displayName: 'lint',
    rootDir: modularRoot,
    testMatch: testMatch,
    globals: {
      'ts-jest': {
        diagnostics: false,
        isolateModules: true,
      },
    },
  };

  const testBin = await resolveAsBin('jest-cli');
  const testArgs = ['--config', `"${JSON.stringify(jestEslintConfig)}"`];
  execSync(testBin, testArgs, {
    cwd: getModularRoot(),
    log: false,
    // @ts-ignore
    env: {
      BABEL_ENV: 'test',
      NODE_ENV: 'test',
      PUBLIC_URL: '',
      MODULAR_ROOT: getModularRoot(),
    },
  });
}
