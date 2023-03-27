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
import { selectWorkspaces } from './utils/selectWorkspaces';
export interface LintOptions {
  all: boolean;
  fix: boolean;
  staged: boolean;
  packages?: string[];
  ancestors?: boolean;
  descendants?: boolean;
  changed?: boolean;
  compareBranch?: string;
}

async function lint(
  options: LintOptions,
  regexes: string[] = [],
): Promise<void> {
  const {
    all = false,
    fix = false,
    staged = false,
    packages = [],
    ancestors = false,
    descendants = false,
    changed = false,
    compareBranch,
  } = options;
  const modularRoot = getModularRoot();
  const lintExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  let runnerMatch = ['<rootDir>/**/src/**/*.{js,jsx,ts,tsx}'];

  const [packageMap] = await getAllWorkspaces();

  const selectiveOptionSpecified =
    packages?.length || ancestors || descendants || changed || compareBranch;

  if (all && selectiveOptionSpecified) {
    logger.warn(
      'You specified --all already; selective options are redundant.',
    );
  }
  if (staged && selectiveOptionSpecified) {
    logger.error("Can't specify --staged along with selective options");
    process.exit(-1);
  }

  if (!all) {
    if (selectiveOptionSpecified) {
      // If at least one of the selective options is specified, calculate target packages from selective options
      const targetPackages = await selectWorkspaces({
        targets: packages,
        changed,
        ancestors,
        descendants,
        compareBranch,
      });

      // Calculate the match regexes for the selective options
      const selectiveMatch = targetPackages
        .map((packageName) => {
          const packageLocation = packageMap.get(packageName)?.location;
          return packageLocation
            ? `<rootDir>/${packageLocation}/src/**/*.{js,jsx,ts,tsx}`
            : undefined;
        })
        .filter(Boolean) as string[];

      // If there are no selective matches and no regexes are specified, there is nothing to test
      if (!selectiveMatch.length && !regexes.length) {
        logger.warn('No target files to lint with the provided selection');
        return;
      }
      // Narrow the matches to the selection matches
      runnerMatch = selectiveMatch;
    } else if ((!isCI || staged) && regexes.length === 0) {
      // Not selective, not --all and no regexes; calculate the file regexes of --diff or --staged
      let diffedFiles: null | string[];

      try {
        // This can throw in case there is no git directory; in this case, we need to continue like nothing happened
        diffedFiles = staged ? getStagedFiles() : getDiffedFiles();
      } catch {
        diffedFiles = null;
        logger.log(
          'Getting staged or diffed files failed - are you sure this is a git repo? Falling back to `--all`.',
        );
      }

      if (diffedFiles !== null) {
        if (diffedFiles.length === 0) {
          logger.log(
            'No diffed files detected. Use the `--all` option to lint the entire codebase',
          );
          return;
        }
        const targetExts = diffedFiles
          .filter((p: string) => lintExtensions.includes(path.extname(p)))
          .map((p: string) => `<rootDir>/${p}`);

        // if none of the diffed files meet the extension criteria, do not lint
        // end the process early with a success
        if (!targetExts.length) {
          logger.warn('No diffed target files to lint found');
          return;
        }
        runnerMatch = targetExts;
      }
    }
  }

  const jestEslintConfig = {
    runner: require.resolve('modular-scripts/jest-runner-eslint'),
    displayName: 'lint',
    rootDir: modularRoot,
    testMatch: runnerMatch,
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  };

  const testArgs = [
    ...regexes,
    '--config',
    generateJestConfig(jestEslintConfig),
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

    if (staged && fix) {
      runnerMatch = runnerMatch.map((p) => p.replace('<rootDir>/', ''));
      addFiles(runnerMatch);
    }
  } catch (err) {
    logger.debug((err as ExecaError).message);
    // ✕ Modular lint did not pass
    throw new Error('\u2715 Modular lint did not pass');
  }
}

export default actionPreflightCheck(lint);
