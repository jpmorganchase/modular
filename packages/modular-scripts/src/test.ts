import * as path from 'path';
import resolve from 'resolve';
import getModularRoot from './utils/getModularRoot';
import execSync from './utils/execSync';
import resolveAsBin from 'resolve-as-bin';
import createJestConfig from './config/jest';

const jestBin = resolveAsBin('jest');

type VerifyPackageTree = () => void;

export default function test(args: string[]): Promise<void> {
  if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
    const verifyPackageTree =
      require('react-scripts/scripts/utils/verifyPackageTree') as VerifyPackageTree; // eslint-disable-line @typescript-eslint/no-var-requires
    verifyPackageTree();
  }

  const modularRoot = getModularRoot();
  const jestConfig = createJestConfig();
  let argv = process.argv
    .slice(3)
    .concat(['--config', JSON.stringify(jestConfig)]);

  // Watch unless on CI or explicitly running all tests
  if (!process.env.CI && args.indexOf('--watchAll=false') === -1) {
    // https://github.com/facebook/create-react-app/issues/5210
    argv.push('--watchAll');
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
  const cleanArgv = [];
  let env = 'jsdom';
  let next;
  do {
    next = argv.shift();
    if (next === '--env') {
      env = argv.shift() as string;
    } else if (next?.indexOf('--env=') === 0) {
      env = next.substring('--env='.length);
    } else {
      cleanArgv.push(next);
    }
  } while (argv.length > 0);
  // @ts-ignore
  argv = cleanArgv;
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
  argv.push('--env', testEnvironment || '');

  // ends the section copied from CRA
  let testBin = jestBin,
    testArgs = argv;

  if (argv.includes('--inspect-brk')) {
    // If we're trying to attach to a debugger, we need to run node
    // instead. This moves around the command line arguments for so.
    testBin = 'node';
    testArgs = [
      '--inspect-brk',
      jestBin,
      ...testArgs.filter((x) => x !== '--inspect-brk'),
    ];
  }

  execSync(testBin, testArgs, {
    cwd: modularRoot,
    log: false,
    // @ts-ignore
    env: {
      BABEL_ENV: 'test',
      NODE_ENV: 'test',
      PUBLIC_URL: '',
      MODULAR_ROOT: modularRoot,
    },
  });

  return Promise.resolve();
}
