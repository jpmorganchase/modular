#!/usr/bin/env node

import createModularApp from './';
import { program } from 'commander';
import * as fs from 'fs-extra';
import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';

// this is a bit gross - but there's no better way of doing this.
const verbose = process.argv.includes('--verbose');

interface Options {
  repo: string;
  preferOffline: string;
  verbose: boolean;
  empty: boolean;
}

program.version(
  (
    fs.readJsonSync(
      require.resolve('create-modular-react-app/package.json'),
    ) as PackageJson
  ).version as string,
);

program.arguments('<name>');
program.option('--repo [value]', 'Should a repository be initialized', 'true');
program.option('--prefer-offline [value]', 'Yarn --prefer-offline', 'true');
program.option(
  '--empty',
  "Don't setup a modular app after creating the repository",
);
program.option('--verbose', 'Run yarn commands with --verbose set', 'false');

program.action(async (name: string, options: Options) => {
  await createModularApp({
    name,
    preferOffline: options.preferOffline !== 'false',
    repo: options.repo !== 'false',
    verbose,
    empty: options.empty,
  }).catch((err) => {
    if (verbose) {
      console.error(err);
    }
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
