import * as path from 'path';
import resolve from 'resolve';
import { ExecaError } from 'execa';
import actionPreflightCheck from '../utils/actionPreflightCheck';
import execAsync from '../utils/execAsync';
import getModularRoot from '../utils/getModularRoot';
import { getAllWorkspaces } from '../utils/getAllWorkspaces';
import { resolveAsBin } from '../utils/resolveAsBin';
import * as logger from '../utils/logger';
import { generateJestConfig } from './utils';
import { selectWorkspaces } from '../utils/selectWorkspaces';
import {
  computeRegexesFromPackageNames,
  partitionPackages,
} from '../utils/unobtrusiveModular';
import { getConfig } from '../utils/config';

export interface TestOptions {
  bypass: boolean;
  swc: boolean;
  ancestors: boolean;
  descendants: boolean;
  bail: boolean;
  debug: boolean;
  changed: boolean;
  clearCache: boolean;
  compareBranch: string;
  coverage: boolean;
  forceExit: boolean;
  env: string;
  json: boolean;
  logHeapUsage: boolean;
  maxWorkers: number;
  'no-cache': boolean;
  regex: string[] | undefined;
  reporters: string[] | undefined;
  runInBand: boolean;
  onlyChanged: boolean;
  outputFile: string;
  silent: boolean;
  testResultsProcessor: string | undefined;
  updateSnapshot: boolean;
  verbose: boolean;
  watch: boolean;
  watchAll: boolean;
}

// via https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/scripts/test.js
// This is a very dirty workaround for https://github.com/facebook/jest/issues/5913.
// We're trying to resolve the environment ourselves because Jest does it incorrectly.
// TODO: remove this as soon as it's fixed in Jest.
function resolveJestDefaultEnvironment(name: string) {
  const jestDir = path.dirname(
    resolve.sync('jest', {
      basedir: __dirname,
    }),
  );
  const jestCLIDir = path.dirname(
    resolve.sync('jest-cli', {
      basedir: jestDir,
    }),
  );
  const jestConfigDir = path.dirname(
    resolve.sync('jest-config', {
      basedir: jestCLIDir,
    }),
  );
  return resolve.sync(name, {
    basedir: jestConfigDir,
  });
}

async function test(options: TestOptions, packages?: string[]): Promise<void> {
  const {
    bypass,
    swc,
    ancestors,
    descendants,
    changed,
    regex: userRegexes,
    compareBranch,
    debug,
    env,
    reporters,
    testResultsProcessor,
    ...jestOptions
  } = options;

  // create argv from jest Options
  const cleanArgv: string[] = [];

  // pass in jest configuration
  const { createJestConfig } = await import('./config');

  const configuredSwc = swc ? swc : getConfig('swcJest', getModularRoot());

  cleanArgv.push(
    '--config',
    generateJestConfig(
      createJestConfig({ reporters, testResultsProcessor }, configuredSwc),
    ),
  );

  let resolvedEnv;
  try {
    resolvedEnv = resolveJestDefaultEnvironment(`jest-environment-${env}`);
  } catch (e) {
    // ignore
  }
  if (!resolvedEnv) {
    try {
      resolvedEnv = resolveJestDefaultEnvironment(env);
    } catch (e) {
      // ignore
    }
  }
  const testEnvironment = resolvedEnv || env;
  cleanArgv.push(`--env=${testEnvironment}`);

  let regexes: string[] = [];
  let nonModularTargets;
  let modularTargets;

  // If --bypass, pass on all options to jest
  if (bypass) {
    // Modular flags compatible with --bypass that shouldn't be passed to Jest
    const bypassCompatibleFlags = ['verbose', 'env', 'swc', 'bypass'];
    cleanArgv.push(
      ...Object.entries(options)
        .filter(([key, v]) => {
          return !bypassCompatibleFlags.some((option) => key === option);
        })
        .map(([key, v]) => {
          const booleanValue = /^(true)$/.exec(String(v));
          return `--${key}${!!booleanValue ? '' : `=${String(v)}`}`;
        }),
    );

    // Get the options that have been incorrectly placed in packages[]
    if (packages) {
      cleanArgv.push(...packages);
    }
  } else {
    // pass on jest programatic options
    const jestArgv = Object.entries(jestOptions).map(([key, v]) => {
      const booleanValue = /^(true)$/.exec(String(v));
      return `--${key}${!!booleanValue ? '' : `=${String(v)}`}`;
    });

    cleanArgv.push(...jestArgv);
    const additionalOptions: string[] = [];
    const cleanRegexes: string[] = [];

    const cleanPackages: string[] = [];

    // Commander seems to read options (--option) passed to the modular test command as
    // arguments (in this case packages), so we filter them out and pass them to jest
    if (packages) {
      extractOptions(packages, cleanPackages, additionalOptions);
    }

    const [workspaceMap] = await getAllWorkspaces(getModularRoot());
    const isSelective =
      changed ||
      ancestors ||
      descendants ||
      userRegexes?.length ||
      cleanPackages.length;

    let selectedTargets: string[];

    if (!isSelective) {
      // If no package and no selector is specified, all packages are specified
      selectedTargets = [...workspaceMap.keys()];
    } else {
      // Otherwise, calculate which packages are selected
      selectedTargets = await selectWorkspaces({
        targets: cleanPackages,
        changed,
        ancestors,
        descendants,
        compareBranch,
      });
    }

    // Split packages into modular and non-modular testable. Make sure that "root" is not there.
    [modularTargets, nonModularTargets] = partitionPackages(
      selectedTargets,
      workspaceMap,
      'test',
    );
    // Compute patterns to pass Jest for the packages that we want to test
    const packageRegexes = await computeRegexesFromPackageNames(modularTargets);

    // Merge and dedupe selective regexes + user-specified regexes
    regexes = [...new Set([...packageRegexes, ...(userRegexes ?? [])])];

    if (regexes?.length) {
      extractOptions(regexes, cleanRegexes, additionalOptions);
    }

    logger.debug(
      `Modular package targets for tests are ${JSON.stringify(
        modularTargets,
      )}.`,
    );
    logger.debug(
      `Non-modular targets selected and eligible for tests are: ${JSON.stringify(
        nonModularTargets,
      )}.`,
    );
    logger.debug(
      `Regexes generated from Modular targets are: ${JSON.stringify(
        packageRegexes,
      )}.`,
    );
    logger.debug(`User-provided regexes are: ${JSON.stringify(userRegexes)}.`);
    logger.debug(
      `Final regexes to pass to Jest are: ${JSON.stringify(cleanRegexes)}.`,
    );

    // If we computed no regexes and there are no non-modular packages to test, bail out
    if (!cleanRegexes?.length && !nonModularTargets.length) {
      process.stdout.write('No workspaces found in selection\n');
      process.exit(0);
    }

    // Push any additional options passed in by debugger or other processes
    cleanArgv.push(...additionalOptions);

    // Finally add the script regexes to run (at the beginning of the array as to not be mistaken for properties assigned to a flag)
    cleanArgv.unshift(...cleanRegexes);
  }

  const jestBin = await resolveAsBin('jest-cli');
  let testBin = jestBin,
    testArgs = cleanArgv;

  if (debug) {
    // If we're trying to attach to a debugger, we need to run node
    // instead. This moves around the command line arguments for so.
    testBin = 'node';
    testArgs = [
      '--inspect-brk',
      jestBin,
      ...testArgs.filter((x) => x !== '--inspect-brk'),
    ];
  }

  // First run Modular tests with Jest. We're not iterating, but providing arguments to Jest, so we do this only if we have Modular test to run
  if (regexes?.length || bypass) {
    logger.debug(
      `Running ${testBin} with cwd: ${getModularRoot()} and args: ${JSON.stringify(
        testArgs,
      )}`,
    );

    try {
      await execAsync(testBin, testArgs, {
        cwd: getModularRoot(),
        log: false,
        // @ts-ignore
        env: {
          BABEL_ENV: 'test',
          NODE_ENV: 'test',
          MODULAR_ROOT: getModularRoot(),
        },
      });
    } catch (err) {
      logger.debug((err as ExecaError).message);
      throw new Error('\u2715 Modular test did not pass');
    }
  }
  if (nonModularTargets) {
    // ...Then run non-Modular (if there are any) tests by running the tests script for each package
    for (const target of nonModularTargets) {
      try {
        await execAsync(`yarn`, ['workspace', target, 'test'], {
          cwd: getModularRoot(),
          log: false,
        });
      } catch (err) {
        logger.debug((err as ExecaError).message);
        throw new Error('\u2715 Modular test did not pass');
      }
    }
  }
}

/**
 * Split out options (--option) that commander incorrectly assumes are arguments
 * @param args list of arguments provided by commander
 * @param cleanedArgs list of arguments after removing options
 * @param additionalOptions list of options extracted from arguments
 */
function extractOptions(
  args: string[],
  cleanedArgs: string[],
  additionalOptions: string[],
) {
  args.forEach((reg) => {
    if (/^(--)([\w]+)/.exec(reg)) {
      return additionalOptions.push(reg);
    }
    return cleanedArgs.push(reg);
  });
  if (additionalOptions.length) {
    additionalOptions.map((reg) => {
      const [option, value] = reg.split('=');
      if (value) {
        return `${option}=${JSON.stringify(value)}`;
      }
      return option;
    });
  }
}

export default actionPreflightCheck(test);
