#!/usr/bin/env node

import * as fs from 'fs-extra';
import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';

import preflightCheck from './cli/preflightCheck';

import program from './cli/program';

import './cli/add';
import './cli/build';
import './cli/test';
import './cli/start';
import './cli/init';
import './cli/workspace';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
// See https://github.com/facebook/create-react-app/blob/f36d61a/packages/react-scripts/bin/react-scripts.js#L11-L16
process.on('unhandledRejection', (err) => {
  throw err;
});

program.version(
  (
    fs.readJsonSync(
      require.resolve('modular-scripts/package.json'),
    ) as PackageJson
  ).version as string,
);

void preflightCheck().then(() => {
  return program.parseAsync(process.argv);
});
