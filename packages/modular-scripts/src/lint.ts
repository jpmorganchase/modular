import * as path from 'path';
import isCI from 'is-ci';
import { resolveAsBin } from './utils/resolve-as-bin';
import getModularRoot from './utils/getModularRoot';
import execSync from './utils/execSync';
import { getDiffedFiles } from './utils/gitActions';
import * as logger from './utils/logger';
import type { LintOptions } from './cli';

export async function lint(
  options: LintOptions,
  regexes: string[] = [],
): Promise<void> {
  const { all = false, fix = false } = options;
  const modularRoot = getModularRoot();
  const lintExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  let targetedFiles = ['<rootDir>/**/src/**/*.{js,jsx,ts,tsx}'];

  if (!all && !isCI) {
    const diffedFiles = getDiffedFiles();
    if (diffedFiles.length === 0) {
      logger.log(
        'No diffed files detected. Add the `--all` option to lint the entire codebase',
      );
      return;
    }
    targetedFiles = diffedFiles
      .filter((p: string) => lintExtensions.includes(path.extname(p)))
      .map((p: string) => `<rootDir>/${p}`);
  }

  const jestEslintConfig = {
    runner: 'modular-scripts/jest-runner-eslint',
    displayName: 'lint',
    rootDir: modularRoot,
    testMatch: targetedFiles,
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    globals: {
      'ts-jest': {
        diagnostics: false,
        isolateModules: true,
      },
    },
  };

  const testArgs = [
    ...regexes,
    '--config',
    `"${JSON.stringify(jestEslintConfig)}"`,
  ];

  const testBin = await resolveAsBin('jest-cli');

  try {
    execSync(testBin, testArgs, {
      cwd: modularRoot,
      log: false,
      // @ts-ignore
      env: {
        MODULAR_ROOT: modularRoot,
        MODULAR_LINT_FIX: String(fix),
      },
    });
  } catch (_err) {
    // silence CLI command failure message because jest-runner-eslint handles printing the lint errors
    process.exit(1);
  }
}
