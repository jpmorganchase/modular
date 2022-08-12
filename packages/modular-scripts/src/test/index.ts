import * as path from 'path';
import { computeAncestorSet } from '@modular-scripts/workspace-resolver';
import actionPreflightCheck from '../utils/actionPreflightCheck';
import resolve from 'resolve';
import { ExecaError } from 'execa';
import execAsync from '../utils/execAsync';
import getModularRoot from '../utils/getModularRoot';
import { getAllWorkspaces } from '../utils/getAllWorkspaces';
import { getChangedWorkspaces } from '../utils/getChangedWorkspaces';
import { resolveAsBin } from '../utils/resolveAsBin';
import * as logger from '../utils/logger';

export interface TestOptions {
  ancestors: boolean;
  bail: boolean;
  debug: boolean;
  changed: string;
  clearCache: boolean;
  coverage: boolean;
  forceExit: boolean;
  env: string;
  json: boolean;
  logHeapUsage: boolean;
  maxWorkers: number;
  'no-cache': boolean;
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

async function test(options: TestOptions, regexes?: string[]): Promise<void> {
  const {
    ancestors,
    changed: changedTargetBranch,
    debug,
    env,
    reporters,
    testResultsProcessor,
    ...jestOptions
  } = options;

  // create argv from jest Options
  const cleanArgv: string[] = [];

  // pass in path to configuration file
  const { createJestConfig } = await import('./config');
  cleanArgv.push(
    '--config',
    `"${JSON.stringify(
      createJestConfig({ reporters, testResultsProcessor }),
    )}"`,
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

  // TODO: make this more readable
  if (changedTargetBranch) {
    const regexesFromChanged = await computeChangedTestsRegexes(
      changedTargetBranch,
      ancestors,
    );
    console.log(regexesFromChanged);
    return;
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

async function computeChangedTestsRegexes(
  targetBranch: string,
  ancestors: boolean,
) {
  // Get all the workspaces
  console.log('MODULAR ROOT:', getModularRoot());
  const allWorkspaces = await getAllWorkspaces(getModularRoot());
  // Get the changed workspaces compared to our target branch
  const changedWorkspaces = await getChangedWorkspaces(
    allWorkspaces,
    targetBranch,
  );
  // Get the ancestors from the changed workspaces TODO: make this take & return a WorkspaceContent?
  const allWorkspaceMap = allWorkspaces[1];
  const changedWorkspaceMap = changedWorkspaces[1];
  const ancestorWorkspaces: Set<string> = ancestors
    ? computeAncestorSet(Object.keys(changedWorkspaceMap), allWorkspaceMap)
    : new Set();
  // TODO: is this needed?
  const ancestorSet: Set<string> = new Set(
    Array.from(ancestorWorkspaces).concat(Object.keys(changedWorkspaceMap)),
  );
  console.log(ancestorSet, allWorkspaceMap);
  const testRegexes = Array.from(ancestorSet).map((depName) =>
    path.normalize(
      `${allWorkspaceMap[depName].location}${path.sep}__tests__/**`,
    ),
  );
  console.log(testRegexes);
}

export default actionPreflightCheck(test);
