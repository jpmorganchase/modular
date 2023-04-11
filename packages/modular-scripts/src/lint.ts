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
import {
  computeRegexesFromPackageNames,
  partitionPackages,
} from './utils/unobtrusiveModular';
export interface LintOptions {
  all: boolean;
  fix: boolean;
  staged: boolean;
  packages?: string[];
  ancestors?: boolean;
  descendants?: boolean;
  changed?: boolean;
  includeNonModular?: boolean;
  compareBranch?: string;
}

async function lint(
  options: LintOptions,
  userRegexes: string[] = [],
): Promise<void> {
  const {
    all = false,
    fix = false,
    staged = false,
    packages = [],
    ancestors = false,
    descendants = false,
    changed = false,
    includeNonModular = false,
    compareBranch,
  } = options;
  const modularRoot = getModularRoot();
  const lintExtensions = ['.ts', '.tsx', '.js', '.jsx'];

  const [workspaceMap] = await getAllWorkspaces();
  const isSelective =
    packages?.length || ancestors || descendants || changed || compareBranch;

  let selectedTargets: string[];

  if (!isSelective) {
    selectedTargets = [...workspaceMap.keys()];
  } else {
    // Otherwise, calculate which packages are selected
    selectedTargets = await selectWorkspaces({
      targets: packages,
      changed,
      ancestors,
      descendants,
      compareBranch,
    });
  }

  // Split packages into modular and non-modular testable. Make sure that "root" is not there.
  const [modularTargets, nonModularTargets] = partitionPackages(
    selectedTargets,
    workspaceMap,
    'lint',
  );

  // Compute patterns to pass Jest for the packages that we want to test
  const packageRegexes = await computeRegexesFromPackageNames(modularTargets);

  // Only set regexes if all or selective options have been specified
  let lintPackageRegexes =
    isSelective || all
      ? packageRegexes.map(
          (regex) => `<rootDir>/${regex}/src/**/*.{js,jsx,ts,tsx}`,
        )
      : [];

  if (all && isSelective) {
    logger.warn(
      'You specified --all already; selective options are redundant.',
    );
  }
  if (staged && isSelective) {
    logger.error("Can't specify --staged along with selective options");
    process.exit(-1);
  }

  // Not selective, not --all and no regexes; calculate the file regexes of --diff or --staged
  if (!all && !isSelective && (!isCI || staged) && userRegexes.length === 0) {
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
      } else {
        lintPackageRegexes = diffedFiles
          .filter((p: string) => lintExtensions.includes(path.extname(p)))
          .map((p: string) => `<rootDir>/${p}`);

        // if none of the diffed files meet the extension criteria, do not lint
        // end the process early with a success
        if (!lintPackageRegexes.length) {
          logger.warn('No diffed target files to lint found');
        }
      }
    }
  }

  // If we computed no regexes and there are no non-modular packages to lint, bail out
  if (
    !lintPackageRegexes?.length &&
    !userRegexes &&
    !nonModularTargets.length
  ) {
    process.stdout.write('No workspaces found in selection\n');
    process.exit(0);
  }

  const jestEslintConfig = {
    runner: require.resolve('modular-scripts/jest-runner-eslint'),
    displayName: 'lint',
    rootDir: modularRoot,
    testMatch: lintPackageRegexes,
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  };

  const lintArgs = [
    ...userRegexes,
    '--config',
    generateJestConfig(jestEslintConfig),
  ];

  const lintBin = await resolveAsBin('jest-cli');

  logger.debug(
    `Regexes for Modular packages being linted: ${JSON.stringify(
      lintPackageRegexes,
    )}`,
  );
  logger.debug(`User provided regexes: ${JSON.stringify(userRegexes)}`);

  // Lint modular packages
  if (lintPackageRegexes.length || userRegexes.length) {
    try {
      logger.debug(
        `Running ${lintBin} with cwd: ${getModularRoot()} and args: ${JSON.stringify(
          lintArgs,
        )}`,
      );
      await execAsync(lintBin, lintArgs, {
        cwd: modularRoot,
        log: false,
        // @ts-ignore
        env: {
          MODULAR_ROOT: modularRoot,
          MODULAR_LINT_FIX: String(fix),
        },
      });

      if (staged && fix) {
        lintPackageRegexes = lintPackageRegexes.map((p) =>
          p.replace('<rootDir>/', ''),
        );
        addFiles(lintPackageRegexes);
      }
    } catch (err) {
      logger.debug((err as ExecaError).message);
      // ✕ Modular lint did not pass
      throw new Error('\u2715 Modular lint did not pass');
    }
  }

  // Lint non-modular packages - TODO: Remove conditional & flag in next major release of Modular (5.0.0)
  if (includeNonModular) {
    try {
      logger.debug(
        `Running lint command in the following non-modular packages: ${JSON.stringify(
          nonModularTargets,
        )}`,
      );
      for (const target of nonModularTargets) {
        await execAsync(`yarn`, ['workspace', target, 'lint'], {
          cwd: getModularRoot(),
          log: false,
        });
      }
    } catch (err) {
      logger.debug((err as ExecaError).message);
      // ✕ Modular lint did not pass
      throw new Error('\u2715 Modular lint did not pass');
    }
  }
}

export default actionPreflightCheck(lint);
