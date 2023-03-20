import * as path from 'path';
import isCI from 'is-ci';
import { ExecaError } from 'execa';

import actionPreflightCheck from './utils/actionPreflightCheck';
import { resolveAsBin } from './utils/resolveAsBin';
import getModularRoot from './utils/getModularRoot';
import execAsync from './utils/execAsync';
import { addFiles, getDiffedFiles, getStagedFiles } from './utils/gitActions';
import * as logger from './utils/logger';
import { generateJestConfig } from './test/utils';
import { getAllWorkspaces } from './utils/getAllWorkspaces';
import { WorkspaceContent } from '@modular-scripts/modular-types';
export interface LintOptions {
  all: boolean;
  fix: boolean;
  staged: boolean;
  packages?: string[];
}

async function lint(
  options: LintOptions,
  regexes: string[] = [],
): Promise<void> {
  const { all = false, fix = false, staged = false, packages } = options;
  const modularRoot = getModularRoot();
  const lintExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  let targetedFiles = ['<rootDir>/**/src/**/*.{js,jsx,ts,tsx}'];

  console.log({ all, fix, staged, packages, regexes });
  const workspaces = await getAllWorkspaces();

  // --packages alone means "only the diffed files contained in these packages"
  // --packages + --staged means "only the staged files contained in these packages"
  // --packages + --all means "only the files contained in these packages"
  const filterPackages = packages?.length
    ? (p: string) => isPathInPackageList(p, packages, workspaces)
    : () => true;

  if (!all && (!isCI || staged) && regexes.length === 0) {
    const diffedFiles = staged ? getStagedFiles() : getDiffedFiles();

    console.log({ diffedFiles });

    if (diffedFiles.length === 0) {
      logger.log(
        'No diffed files detected. Use the `--all` option to lint the entire codebase',
      );
      return;
    }
    const targetExts = diffedFiles
      .filter(filterPackages)
      .filter((p: string) => lintExtensions.includes(path.extname(p)))
      .map((p: string) => `<rootDir>/${p}`);

    // if none of the diffed files meet the extension criteria, do not lint
    // end the process early with a success
    if (!targetExts.length) {
      logger.debug('No diffed js,jsx,ts,tsx files found');
      return;
    }
    targetedFiles = targetExts;
  }

  console.log({ targetedFiles });

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
    generateJestConfig(jestEslintConfig),
  ];

  console.log({ testArgs });

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

function isPathInPackageList(
  p: string,
  packages: string[],
  workspaces: WorkspaceContent,
) {
  console.log('testing', { p, packages });
  return false;
}

export default actionPreflightCheck(lint);
