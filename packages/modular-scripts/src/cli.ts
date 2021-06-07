#!/usr/bin/env node
import commander from 'commander';
import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';

import preflightCheck from './utils/preflightCheck';

import buildPackages from './build';
import addPackage from './addPackage';
import start from './start';
import test, { TestOptions } from './test';

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

program
  .command('add <package-name>')
  .description(`Add a new folder into the modular workspace.`)
  .option(
    '--unstable-type <type>',
    "Type of the folder ('app', 'view', 'package')",
  )
  .option('--unstable-name <name>', 'Package name for the package.json')
  .option(
    '--prefer-offline',
    'Equivalent of --prefer-offline for yarn installations',
    true,
  )
  .action(
    (
      packageName: string,
      addOptions: {
        unstableType?: string;
        unstableName?: string;
        preferOffline?: boolean;
      },
    ) => {
      return addPackage(
        packageName,
        addOptions.unstableType,
        addOptions.unstableName,
        addOptions.preferOffline,
      );
    },
  );

program
  .command('build <packages...>')
  .description(
    'Build a list of packages (multiple package names can be supplied separated by space)',
  )
  .option('--preserve-modules')
  .action(
    async (
      packagePaths: string[],
      options: {
        preserveModules?: boolean;
      },
    ) => {
      console.log('building packages at:', packagePaths.join(', '));

      for (let i = 0; i < packagePaths.length; i++) {
        try {
          await buildPackages(packagePaths[i], options['preserveModules']);
        } catch (err) {
          console.error(`building ${packagePaths[i]} failed`);
          throw err;
        }
      }
    },
  );

interface JestOption {
  default?: boolean | string;
  description: string;
  type: 'boolean' | 'string';
}
type JestOptions = Record<string, JestOption>;

const testOptions =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (require('jest-cli/build/cli/args.js') as { options: JestOptions }).options;

interface CLITestOptions extends TestOptions {
  U: boolean;
}

program
  .command('test [regexes...]')
  .option(
    '--debug',
    'Setup node.js debugger on the test process - equivalent of setting --inspect-brk on a node.js process',
    false,
  )
  .option('--coverage', testOptions.coverage.description)
  .option('--forceExit', testOptions.forceExit.description)
  .option('--env <env>', testOptions.env.description, 'jsdom')
  .option('--maxWorkers <workers>', testOptions.maxWorkers.description)
  .option('--onlyChanged', testOptions.onlyChanged.description)
  .option('--json', testOptions.json.description)
  .option('--outputFile <file>', testOptions.outputFile.description)
  .option('--reporters <reporters...>', testOptions.reporters.description)
  .option('--runInBand', testOptions.runInBand.description)
  .option('--silent', testOptions.silent.description)
  .option('--showConfig', testOptions.showConfig.description)
  .option(
    '--testResultsProcessor <reporter>',
    testOptions.testResultsProcessor.description,
  )
  .option('--updateSnapshot, -u', testOptions.updateSnapshot.description)
  .option('--verbose', testOptions.verbose.description)
  .option('--watch', testOptions.watch.description)
  .option(
    '--watchAll [value]',
    testOptions.watchAll.description,
    !process.env.CI,
  )
  .option('--bail', testOptions.bail.description)
  .option('--clearCache', testOptions.clearCache.description)
  .option('--logHeapUsage', testOptions.logHeapUsage.description)
  .option('--no-cache', testOptions.cache.description)
  .description('Run tests over the codebase')
  .action((regexes: string[], options: CLITestOptions) => {
    const { U, ...testOptions } = options;

    // proxy simplified options to testOptions;
    testOptions.updateSnapshot = !!(options.updateSnapshot || U);

    return test(testOptions, regexes);
  });

program
  .command('start <packageName>')
  .description(
    `Start a dev-server for an app. Only available for modular 'app' types.`,
  )
  .action((packageName: string) => {
    return start(packageName);
  });

program
  .command('workspace')
  .description('Retrieve the information for the current workspace info')
  .action(async () => {
    const { getWorkspaceInfo } = await import('./utils/getWorkspaceInfo');
    const workspace = await getWorkspaceInfo();
    console.log(JSON.stringify(workspace, null, 2));
  });

void preflightCheck()
  .then(() => {
    return program.parseAsync(process.argv);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
