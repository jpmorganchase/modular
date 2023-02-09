import * as path from 'path';
import actionPreflightCheck from '../utils/actionPreflightCheck';
import resolve from 'resolve';
import { ExecaError } from 'execa';
import execAsync from '../utils/execAsync';
import getModularRoot from '../utils/getModularRoot';
import { getAllWorkspaces } from '../utils/getAllWorkspaces';
import { resolveAsBin } from '../utils/resolveAsBin';
import * as logger from '../utils/logger';
import { generateJestConfig } from './utils';
import { selectWorkspaces } from '../utils/selectWorkspaces';
import { ModularWorkspacePackage } from '@modular-scripts/modular-types';

export interface TestOptions {
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
  cleanArgv.push(
    '--config',
    generateJestConfig(createJestConfig({ reporters, testResultsProcessor })),
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

  // pass on all programatic options
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

  console.log({ changed, ancestors, descendants, userRegexes, cleanPackages });

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
  const [modularTargets, nonModularTargets] = partitionTestablePackages(
    selectedTargets,
    workspaceMap,
  );
  // Compute patterns to pass Jest for the packages that we want to test
  const packageRegexes = await computeRegexesFromPackageNames(modularTargets);

  // Merge and dedupe selective regexes + user-specified regexes
  const regexes = [...new Set([...packageRegexes, ...(userRegexes ?? [])])];

  console.log({ modularTargets, nonModularTargets });
  console.log({ packageRegexes });
  console.log({ regexes });

  if (regexes?.length) {
    extractOptions(regexes, cleanRegexes, additionalOptions);
  }

  logger.debug(
    `Selective testing: targets are ${JSON.stringify(
      modularTargets,
    )}, which generates these regexes: ${JSON.stringify(
      packageRegexes,
    )}. User-provided regexes are ${JSON.stringify(
      userRegexes,
    )} and final regexes are ${JSON.stringify(regexes)}`,
  );

  // Test is selective but we computed no regexes; bail out
  if (!regexes?.length) {
    process.stdout.write('No workspaces found in selection\n');
    process.exit(0);
  }

  // push any additional options passed in by debugger or other processes
  cleanArgv.push(...additionalOptions);

  // finally add the script regexes to run
  cleanArgv.push(...cleanRegexes);

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
        PUBLIC_URL: '',
        MODULAR_ROOT: getModularRoot(),
      },
    });
  } catch (err) {
    logger.debug((err as ExecaError).message);
    // ✕ Modular test did not pass
    throw new Error('\u2715 Modular test did not pass');
  }
}

async function computeRegexesFromPackageNames(
  targets: string[],
): Promise<string[]> {
  const allWorkspaces = await getAllWorkspaces(getModularRoot());
  return targets
    .filter((packageName) => allWorkspaces[0].get(packageName)?.type)
    .map((packageName) => allWorkspaces[0].get(packageName)?.location)
    .filter(Boolean) as string[];
}

// TODO: make this return the new arrays intead of modifying arguments in-place

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

function partitionTestablePackages(
  targets: string[],
  workspaceMap: Map<string, ModularWorkspacePackage>,
) {
  // Split testable packages into modular and non-modular
  return targets.reduce<[string[], string[]]>(
    ([testableModularTargetList, testableNonModularTargetList], current) => {
      const currentPackageInfo = workspaceMap.get(current);
      if (
        currentPackageInfo?.modular &&
        currentPackageInfo.modular.type !== 'root'
      ) {
        testableModularTargetList.push(currentPackageInfo.name);
      }
      if (
        !currentPackageInfo?.modular &&
        currentPackageInfo?.rawPackageJson.scripts?.test
      ) {
        testableNonModularTargetList.push(currentPackageInfo.name);
      }

      return [testableModularTargetList, testableNonModularTargetList];
    },
    [[], []],
  );
}

export default actionPreflightCheck(test);
