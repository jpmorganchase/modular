#!/usr/bin/env node

import createModularApp from './';
import { program } from 'commander';
import * as fs from 'fs-extra';
import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';

// this is a bit gross - but there's no better way of doing this.
const verbose = process.argv.includes('--verbose');

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', (err) => {
  throw err;
});

interface Options {
  repo: boolean;
  preferOffline: boolean;
  verbose: boolean;
}

program.version(
  (
    fs.readJsonSync(
      require.resolve('create-modular-react-app/package.json'),
    ) as PackageJson
  ).version as string,
);

program.arguments('<name>');
program.option('--repo [value]', 'Should a repository be initialized', false);
program.option('--prefer-offline', 'Yarn --prefer-offline', true);
program.option('--verbose', 'Run yarn commands with --verbose set');
program.action(async (name: string, options: Options) => {
  await createModularApp({
    name,
    preferOffline: options.preferOffline,
    repo: options.repo,
    verbose,
  });
});

try {
  void program
    .parseAsync(process.argv)
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      if (verbose) {
        console.error(err);
      }
      process.exit(1);
    });
} catch (err) {
  if (verbose) {
    console.error(err);
  }
  process.exit(1);
}
