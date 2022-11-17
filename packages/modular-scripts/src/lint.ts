import * as path from 'path';
import isCI from 'is-ci';
import { ExecaError } from 'execa';

import actionPreflightCheck from './utils/actionPreflightCheck';
import { resolveAsBin } from './utils/resolveAsBin';
import getModularRoot from './utils/getModularRoot';
import execAsync from './utils/execAsync';
import { addFiles, getDiffedFiles, getStagedFiles } from './utils/gitActions';
import * as logger from './utils/logger';
import * as tmp from 'tmp';
import { writeJSONSync } from 'fs-extra';
export interface LintOptions {
  all: boolean;
  fix: boolean;
  staged: boolean;
}

async function lint(
  options: LintOptions,
  regexes: string[] = [],
): Promise<void> {
  const { all = false, fix = false, staged = false } = options;
  const modularRoot = getModularRoot();
  const lintExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  let targetedFiles = ['<rootDir>/**/src/**/*.{js,jsx,ts,tsx}'];

  if (!all && (!isCI || staged) && regexes.length === 0) {
    const diffedFiles = staged ? getStagedFiles() : getDiffedFiles();
    if (diffedFiles.length === 0) {
      logger.log(
        'No diffed files detected. Use the `--all` option to lint the entire codebase',
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

  // Only used when running on Windows
  const tempConfigPath = path.join(
    tmp.dirSync().name,
    'temp-jest-eslint-config.json',
  );

  // Windows: pass in configuration as a file as jest won't accept "" around the object and Windows doesn't accept JSON object {} passed directly
  // Any other plaform pass config directly to command
  let testArgs: string[];
  if (process.platform === 'win32') {
    writeJSONSync(tempConfigPath, jestEslintConfig);
    testArgs = [...regexes, '--config', tempConfigPath];
  } else {
    testArgs = [...regexes, '--config', JSON.stringify(jestEslintConfig)];
  }

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

    if (staged && fix) {
      targetedFiles = targetedFiles.map((p) => p.replace('<rootDir>/', ''));
      addFiles(targetedFiles);
    }
  } catch (err) {
    logger.debug((err as ExecaError).message);
    // ✕ Modular lint did not pass
    throw new Error('\u2715 Modular lint did not pass');
  }
}

export default actionPreflightCheck(lint);
