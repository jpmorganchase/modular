import * as path from 'path';
import resolve from 'resolve';
import resolveBin from 'resolve-as-bin';
import execSync from '../utils/execSync';
import getModularRoot from '../utils/getModularRoot';
export interface TestOptions {
  debug: boolean;
  coverage: boolean;
  forceExit: boolean;
  env: string;
  maxWorkers: number;
  onlyChanged: boolean;
  json: boolean;
  outputFile: string;
  reporters: string[] | undefined;
  runInBand: boolean;
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

export default async function test(
  options: TestOptions,
  regexes?: string[],
): Promise<void> {
  const { debug, env, reporters, testResultsProcessor, ...jestOptions } =
    options;

  // create argv from jest Options
  const cleanArgv: string[] = [];

  // pass in path to configuration file
  const { createJestConfig } = await import('../config/jest');
  cleanArgv.push(
    '--config',
    `'${JSON.stringify(
      createJestConfig({ reporters, testResultsProcessor }),
    )}'`,
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
    const value = JSON.parse(v as string) as string | number | boolean;
    return `--${key}${!!value ? '' : `=${String(value)}`}`;
  });
  cleanArgv.push(...jestArgv);

  // finally add the script regexes to run
  cleanArgv.push(...(regexes || []));

  const jestBin = resolveBin('jest');
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
    execSync(testBin, testArgs, {
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
  } catch (e) {
    process.exit(1);
  }
}
