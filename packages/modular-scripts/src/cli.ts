#!/usr/bin/env node

import mri from 'mri';

import preflightCheck from './preflightCheck';

import build from './build';
import addPackage from './addPackage';
import start from './start';
import test from './test';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
// See https://github.com/facebook/create-react-app/blob/f36d61a/packages/react-scripts/bin/react-scripts.js#L11-L16
process.on('unhandledRejection', (err) => {
  throw err;
});

async function run() {
  const help = `
  Usage:

    $ modular add <package-name>
    $ modular start
    $ modular build
    $ modular test
`;

  await preflightCheck();

  const argv = mri(process.argv.slice(2));

  const command = argv._[0];
  try {
    switch (command) {
      case 'add':
        return addPackage(
          argv._[1],
          argv['unstable-type'] as string | undefined,
          argv['unstable-name'] as string | undefined,
        );
      case 'test':
        return test(process.argv.slice(3));
      case 'start':
        return start(argv._[1]);
      case 'build':
        return buildSequential(
          argv._[1].split(','),
          argv['preserve-modules'] as boolean | undefined,
        );
      default:
        console.log(help);
        process.exit(1);
    }
  } catch (err) {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    // When there is an `execa` Error with an `.exitCode` the
    // error message will already have been printed out by the
    // process so we only need to bail with the exit code.
    if (err.exitCode !== undefined) {
      process.exit(err.exitCode);
    }
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    throw err;
  }
}

async function buildSequential(
  packagePaths: string[],
  preserveModules?: boolean,
): Promise<void> {
  console.log('building packages at:', packagePaths.join(', '));

  for (let i = 0; i < packagePaths.length; i++) {
    try {
      await build(packagePaths[i], preserveModules);
    } catch (err) {
      console.error(`building ${packagePaths[i]} failed`);
      throw err;
    }
  }
}

void run().catch((err) => {
  // todo - cleanup on errors
  console.error(err);
  process.exit(1);
});
