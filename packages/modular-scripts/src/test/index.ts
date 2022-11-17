import * as path from 'path';
import { computeAncestorWorkspaces } from '@modular-scripts/workspace-resolver';
import actionPreflightCheck from '../utils/actionPreflightCheck';
import resolve from 'resolve';
import { ExecaError } from 'execa';
import execAsync from '../utils/execAsync';
import getModularRoot from '../utils/getModularRoot';
import { getAllWorkspaces } from '../utils/getAllWorkspaces';
import { getChangedWorkspaces } from '../utils/getChangedWorkspaces';
import { resolveAsBin } from '../utils/resolveAsBin';
import { writeJsonSync, rmdirSync } from 'fs-extra';
import * as logger from '../utils/logger';
import type {
  WorkspaceContent,
  ModularWorkspacePackage,
} from '@modular-scripts/modular-types';
import { modularRoot } from '../../react-scripts/config/paths';

export interface TestOptions {
  ancestors: boolean;
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
  reporters: string[] | undefined;
  runInBand: boolean;
  onlyChanged: boolean;
  outputFile: string;
  package: string[] | undefined;
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

async function test(
  options: TestOptions,
  userRegexes?: string[],
): Promise<void> {
  const {
    ancestors,
    changed,
    package: packages,
    compareBranch,
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
  const configFile = path.join(modularRoot, 'tmp-config', 'jest.config.json');
  writeJsonSync(
    configFile,
    createJestConfig({ reporters, testResultsProcessor }),
  );

  cleanArgv.push('--config', configFile);

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

  // There are two ways of discovering the test regexes we need: either they're specified by the user as CLI arguments
  // or they have to be calculated from selective options (--changed and --package) and optionally agumented with --ancestors
  const isSelective = changed || packages?.length;
  const regexes = isSelective
    ? await computeSelectiveRegexes({
        changed,
        compareBranch,
        packages,
        ancestors,
      })
    : userRegexes;

  // If test is selective (user set --changed or --package) and we computed no regexes, then bail out
  if (!regexes?.length && isSelective) {
    process.stdout.write(
      changed
        ? 'No changed workspaces found\n'
        : 'No workspaces found in selection\n',
    );
    process.exit(0);
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

  // Clean up config file
  rmdirSync(path.join(modularRoot, 'tmp-config'), { recursive: true });
}

// This function takes all the selective options, validates them and returns a subset of workspaces to test
async function computeSelectiveRegexes({
  changed,
  compareBranch,
  packages,
  ancestors,
}: {
  changed: boolean;
  compareBranch?: string;
  packages?: string[];
  ancestors: boolean;
}) {
  logger.debug(
    packages?.length
      ? `Calculating test regexes from specified packages: ${JSON.stringify(
          packages,
        )}`
      : `Calculating test regexes from changed workspaces, compared with ${
          compareBranch ?? 'default'
        } branch`,
  );

  if ((!changed && !packages?.length) || (changed && packages?.length)) {
    throw new Error(
      `Conflicting options: --changed (${changed.toString()}) and --package ("${JSON.stringify(
        packages,
      )}")`,
    );
  }

  // It's terser if we mutate WorkspaceContent; we will use it only to pass it to computeTestsRegexes
  let resultWorkspaceContent: WorkspaceContent = packages?.length
    ? await getSinglePackagesContent(packages)
    : await getChangedWorkspacesContent(compareBranch);

  if (ancestors) {
    logger.debug(
      `Calculating ancestors of packages: ${JSON.stringify(
        Object.keys(resultWorkspaceContent[1]),
      )}`,
    );
    resultWorkspaceContent = await getAncestorWorkspacesContent(
      resultWorkspaceContent,
    );
  }

  logger.debug(
    `Selected test packages are: ${JSON.stringify(
      Object.keys(resultWorkspaceContent[1]),
    )}`,
  );

  return computeTestsRegexes(resultWorkspaceContent);
}

// This function returns a WorkspaceContent containing all the changed workspaces, compared to targetBranch
async function getChangedWorkspacesContent(targetBranch: string | undefined) {
  const allWorkspaces = await getAllWorkspaces(getModularRoot());
  // Get the changed workspaces compared to our target branch
  const changedWorkspaces = await getChangedWorkspaces(
    allWorkspaces,
    targetBranch,
  );
  return changedWorkspaces;
}

// This function returns a WorkspaceContent from an array of workspace names
async function getSinglePackagesContent(singlePackages: string[]) {
  // Get all the workspaces
  const allWorkspaces = await getAllWorkspaces(getModularRoot());
  const uniqueSinglePackages = Array.from(new Set(singlePackages));

  const result: WorkspaceContent = [
    new Map<string, ModularWorkspacePackage>(),
    {},
  ];

  const [sourcePackageContent, sourcePackageMap] = allWorkspaces;
  const [targetPackageContent, targetPackageMap] = result;

  // Filter, copy onto result and validate existence. This is easier to express with a mutable for loop
  for (const pkgName of uniqueSinglePackages) {
    const packageContent = sourcePackageContent.get(pkgName);
    if (!sourcePackageMap[pkgName] || !packageContent) {
      throw new Error(
        `Package ${pkgName} was specified, but Modular couldn't find it`,
      );
    }
    targetPackageContent.set(pkgName, packageContent);
    targetPackageMap[pkgName] = sourcePackageMap[pkgName];
  }

  return result;
}

// This function takes a WorkspaceContent and returns a WorkspaceContent agumented with all the ancestors of the original one
async function getAncestorWorkspacesContent(
  selectedWorkspaces: WorkspaceContent,
) {
  const allWorkspaces = await getAllWorkspaces(getModularRoot());
  return computeAncestorWorkspaces(selectedWorkspaces, allWorkspaces);
}

// This function returns a list for test regexes from a WorkspaceContent
function computeTestsRegexes(selectedWorkspaces: WorkspaceContent) {
  const testRegexes = Object.values(selectedWorkspaces[1]).map(
    ({ location }) => location,
  );
  return testRegexes;
}

export default actionPreflightCheck(test);
