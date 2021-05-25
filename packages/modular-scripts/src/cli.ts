#!/usr/bin/env node
import commander from 'commander';
import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';

import preflightCheck from './utils/preflightCheck';

import add from './cli/add';
import build from './cli/build';
import test from './cli/test';
import start from './cli/start';
import init from './cli/init';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
// See https://github.com/facebook/create-react-app/blob/f36d61a/packages/react-scripts/bin/react-scripts.js#L11-L16
process.on('unhandledRejection', (err) => {
  throw err;
});

const program = new commander.Command('modular');
program.version(
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (require('../package.json') as PackageJson).version as string,
);

program.addCommand(add);
program.addCommand(build);
program.addCommand(test);
program.addCommand(start);
program.addCommand(init);

program
  .command('workspace')
  .description('Retrieve the information for the current workspace info')
  .action(async () => {
    const { getWorkspaceInfo } = await import('./getWorkspaceInfo');
    const workspace = await getWorkspaceInfo();
    console.log(JSON.stringify(workspace, null, 2));
  });

void preflightCheck().then(() => {
  return program.parseAsync(process.argv);
});
