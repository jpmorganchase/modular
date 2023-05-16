import * as path from 'path';
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
  fix: boolean;
  staged: boolean;
  regex?: string[];
  ancestors?: boolean;
  descendants?: boolean;
  changed?: boolean;
  compareBranch?: string;
  diff?: boolean;
}

async function lint(
  options: LintOptions,
  packages: string[] = [],
): Promise<void> {
  const {
    fix = false,
    staged = false,
    regex: userRegexes = [],
    ancestors = false,
    descendants = false,
    changed = false,
    compareBranch,
    diff = false,
  } = options;
  const modularRoot = getModularRoot();
  const lintExtensions = ['.ts', '.tsx', '.js', '.jsx'];

  const [workspaceMap] = await getAllWorkspaces();

  const isSelective = changed || ancestors || descendants || packages.length;

  if ((staged || diff || userRegexes.length) && isSelective) {
    logger.error(
      "Can't specify --staged, --diff or --regex along with selective options",
    );
    process.exit(-1);
  }
  if (
    (staged && diff) ||
    (staged && userRegexes.length) ||
    (diff && userRegexes.length)
  ) {
    logger.error(
      "--regex, --diff and --staged are mutually exclusive options that can't be used together",
    );
    process.exit(-1);
  }

  let modularTargets: string[];
  let nonModularTargets: string[];

  // If --diff or --staged, lint only diffed or staged files,
  // otherwise lint selected packages or all packages if nothing selected
  let lintRegexes: string[];

  if (diff || staged) {
    // Calculate the file regexes of --diff or --staged
    try {
      // This can throw in case there is no git directory; in this case, we need to continue like nothing happened
      const diffedFiles = staged
        ? getStagedFiles()
        : getDiffedFiles(compareBranch);

      if (diffedFiles.length === 0) {
        logger.warn(`No staged or diffed files detected.`);
        process.exit(0);
      } else {
        lintRegexes = diffedFiles
          .filter((p: string) => lintExtensions.includes(path.extname(p)))
          .map((p: string) => `<rootDir>/${p}`);

        // if none of the diffed files meet the extension criteria, do not lint
        // end the process early with a success
        if (!lintRegexes.length) {
          logger.warn('No lintable diffed or staged target files found');
          process.exit(0);
        }
      }
    } catch {
      logger.error(
        'Getting staged or diffed files failed - are you sure this is a git repo?',
      );
      process.exit(1);
    }
    nonModularTargets = [];
  } else if (userRegexes.length) {
    // Don't calculate any regexes or non-modular targets - only use the user provided regexes
    lintRegexes = [];
    nonModularTargets = [];
  } else {
    // Compute selected packages or run on all modular & non-modular packages
    let selectedTargets: string[];

    if (isSelective) {
      selectedTargets = await selectWorkspaces({
        targets: packages,
        changed,
        compareBranch,
        descendants,
        ancestors,
      });
    } else {
      selectedTargets = [...workspaceMap.keys()];
    }

    // Split packages into modular and non-modular testable. Make sure that "root" is not there.
    [modularTargets, nonModularTargets] = partitionPackages(
      selectedTargets,
      workspaceMap,
      'lint',
    );

    // Compute patterns to pass Jest for the packages that we want to test
    const selectedPackageRegexes = await computeRegexesFromPackageNames(
      modularTargets,
    );

    const processedPackageRegexes = selectedPackageRegexes.map(
      (regex) => `<rootDir>/${regex}/src/**/*.{js,jsx,ts,tsx}`,
    );

    lintRegexes = processedPackageRegexes;
  }

  // If we computed no regexes and there are no non-modular packages to lint, bail out
  if (!lintRegexes?.length && !userRegexes && !nonModularTargets.length) {
    process.stdout.write('No workspaces found in selection\n');
    process.exit(0);
  }

  const jestEslintConfig = {
    runner: require.resolve('modular-scripts/jest-runner-eslint'),
    displayName: 'lint',
    rootDir: modularRoot,
    testMatch: lintRegexes,
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  };

  const lintArgs = [
    ...userRegexes,
    '--config',
    generateJestConfig(jestEslintConfig),
  ];

  const lintBin = await resolveAsBin('jest-cli');

  logger.debug(
    `Regexes for Modular packages being linted: ${JSON.stringify(lintRegexes)}`,
  );
  logger.debug(`User provided regexes: ${JSON.stringify(userRegexes)}`);

  // Lint modular packages
  if (lintRegexes.length || userRegexes.length) {
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
        lintRegexes = lintRegexes.map((p) => p.replace('<rootDir>/', ''));
        addFiles(lintRegexes);
      }
    } catch (err) {
      logger.debug((err as ExecaError).message);
      // ✕ Modular lint did not pass
      throw new Error('\u2715 Modular lint did not pass');
    }
  }

  if (nonModularTargets.length) {
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
