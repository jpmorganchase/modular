import * as path from 'path';
import isCI from 'is-ci';
import { ExecaError } from 'execa';

import actionPreflightCheck from './utils/actionPreflightCheck';
import { resolveAsBin } from './utils/resolveAsBin';
import getModularRoot from './utils/getModularRoot';
import execAsync from './utils/execAsync';
import { getDiffedFiles } from './utils/gitActions';
import * as logger from './utils/logger';

export interface LintOptions {
  all: boolean;
  fix: boolean;
}

async function lint(
  options: LintOptions,
  regexes: string[] = [],
): Promise<void> {
  const { all = false, fix = false } = options;
  const modularRoot = getModularRoot();
  const lintExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  let targetedFiles = ['<rootDir>/**/*.{js,jsx,ts,tsx}'];

  if (!all && !isCI && !regexes) {
    const diffedFiles = getDiffedFiles();
    if (diffedFiles.length === 0) {
      logger.log(
        'No diffed files detected. Add the `--all` option to lint the entire codebase',
      );
      return;
    }

    const targetExts = diffedFiles
      .filter((p: string) => lintExtensions.includes(path.extname(p)))
      .map((p: string) => `<rootDir>/${p}`);

    // if none of the diffed files do not meet the extension criteria, do not lint
    // end the process early with a success
    if (!targetExts.length) {
      logger.debug('No diffed js,jsx,ts,tsx files found');
      return;
    }
    targetedFiles = targetExts;
  }

  const jestEslintConfig = {
    runner: require.resolve('modular-scripts/jest-runner-eslint'),
    displayName: 'lint',
    rootDir: modularRoot,
    testMatch: targetedFiles,
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  };

  const testArgs = [
    ...regexes,
    '--config',
    `"${JSON.stringify(jestEslintConfig)}"`,
  ];

  const testBin = await resolveAsBin('jest-cli');

  try {
    await execAsync(testBin, testArgs, {
      cwd: modularRoot,
      log: false,
      // @ts-ignore
      env: {
        MODULAR_ROOT: modularRoot,
        MODULAR_LINT_FIX: String(fix),
      },
    });
  } catch (err) {
    logger.debug((err as ExecaError).message);
    // ✕ Modular lint did not pass
    throw new Error('\u2715 Modular lint did not pass');
  }
}

export default actionPreflightCheck(lint);
