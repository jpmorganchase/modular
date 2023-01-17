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

  const selectedTargets = await selectWorkspaces({
    targets: packages ?? [],
    changed,
    ancestors,
    descendants,
    compareBranch,
  });

  let regexes: string[] = [];
  const isSelective =
    changed || ancestors || descendants || userRegexes || packages?.length;

  if (isSelective) {
    const packageRegexes = await computeRegexesFromPackageNames(
      selectedTargets,
    );
    // Merge and dedupe selective regexes + user-specified regexes
    regexes = [...new Set([...packageRegexes, ...(userRegexes ?? [])])];

    logger.debug(
      `Selective testing: targets are ${JSON.stringify(
        selectedTargets,
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
  }

  if (regexes?.length) {
    regexes.forEach((reg) => {
      if (/^(--)([\w]+)/.exec(reg)) {
        return additionalOptions.push(reg);
      }
      return cleanRegexes.push(reg);
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
    .map((packageName) => allWorkspaces[0].get(packageName)?.location)
    .filter(Boolean) as string[];
}

export default actionPreflightCheck(test);
