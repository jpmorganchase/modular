#!/usr/bin/env node

import { ExecaError } from 'execa';
import * as fs from 'fs-extra';
import * as isCI from 'is-ci';
import chalk from 'chalk';
import commander from 'commander';
import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import type { TestOptions } from './test';
import type { LintOptions } from './lint';

import startupCheck from './utils/startupCheck';
import actionPreflightCheck from './utils/actionPreflightCheck';
import * as logger from './utils/logger';
import getModularRoot from './utils/getModularRoot';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
// See https://github.com/facebook/create-react-app/blob/f36d61a/packages/react-scripts/bin/react-scripts.js#L11-L16
process.on('unhandledRejection', (err) => {
  throw err;
});

const program = new commander.Command('modular');
program.version(
  (
    fs.readJsonSync(
      require.resolve('modular-scripts/package.json'),
    ) as PackageJson
  ).version as string,
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
  .option('--verbose', 'Run yarn commands with --verbose set')
  .action(
    async (
      packageName: string,
      addOptions: {
        unstableType?: string;
        unstableName?: string;
        preferOffline?: boolean;
        verbose?: boolean;
      },
    ) => {
      const { default: addPackage } = await import('./addPackage');
      return addPackage(
        packageName,
        addOptions.unstableType,
        addOptions.unstableName,
        addOptions.preferOffline,
        addOptions.verbose,
      );
    },
  );

program
  .command('build <packages...>')
  .description(
    'Build a list of packages (multiple package names can be supplied separated by space)',
  )
  .option(
    '--preserve-modules [value]',
    'Preserve module structure in generated modules',
    'true',
  )
  .option('--private', 'Enable the building of private packages', false)
  .action(
    async (
      packagePaths: string[],
      options: {
        preserveModules: string;
        private: boolean;
      },
    ) => {
      const modularRoot = getModularRoot();
      if (process.cwd() !== modularRoot) {
        throw new Error(
          'This command can only be run from the root of a modular project',
        );
      }

      const { default: build } = await import('./build');
      logger.log('building packages at:', packagePaths.join(', '));

      for (let i = 0; i < packagePaths.length; i++) {
        try {
          await build(
            packagePaths[i],
            JSON.parse(options.preserveModules) as boolean,
            options.private,
          );
        } catch (err) {
          logger.error(`building ${packagePaths[i]} failed`);
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
  .option('--watchAll [value]', testOptions.watchAll.description, !isCI)
  .option('--bail [value]', testOptions.bail.description, isCI)
  .option('--clearCache', testOptions.clearCache.description)
  .option('--logHeapUsage', testOptions.logHeapUsage.description)
  .option('--no-cache', testOptions.cache.description)
  .allowUnknownOption()
  .description('Run tests over the codebase')
  .action(async (regexes: string[], options: CLITestOptions) => {
    const { default: test } = await import('./test');

    // proxy simplified options to testOptions
    const { U, ...testOptions } = options;
    testOptions.updateSnapshot = !!(options.updateSnapshot || U);

    return test(testOptions, regexes);
  });

program
  .command('start <packageName>')
  .description(
    `Start a dev-server for an app. Only available for modular 'app' types.`,
  )
  .action(async (packageName: string) => {
    const { default: start } = await import('./start');
    return start(packageName);
  });

program
  .command('workspace')
  .description('Retrieve the information for the current workspace info')
  .action(
    actionPreflightCheck(async () => {
      const { default: getWorkspaceInfo } = await import(
        './utils/getWorkspaceInfo'
      );
      const workspace = await getWorkspaceInfo();
      process.stdout.write(JSON.stringify(workspace, null, 2));
    }),
  );

interface InitOptions {
  y: boolean;
  preferOffline: string;
  verbose: boolean;
}

program
  .command('init')
  .description('Initialize a new modular root in the current folder')
  .option('-y', 'equivalent to the -y flag in NPM')
  .option('--prefer-offline [value]', 'delegate to offline cache first', true)
  .option('--verbose', 'Run yarn commands with --verbose set')
  .action(async (options: InitOptions) => {
    const { default: initWorkspace } = await import('./init');
    await initWorkspace(
      options.y,
      JSON.parse(options.preferOffline),
      options.verbose,
    );
  });

program
  .command('check')
  .description(
    'Manually run modular checks against the current modular repository',
  )
  .action(async () => {
    const { check } = await import('./check');
    await check();
    logger.log(chalk.green('Success!'));
  });

program
  .command('convert')
  .description('Converts react app in current directory into a modular package')
  .action(async () => {
    const { convert } = await import('./convert');
    await convert();
    logger.log(
      chalk.green('Successfully converted your app into a modular app!'),
    );
  });

// TODO: enhancement - should take a type option (app, view, package)
// port are only available for apps right now
program
  .command('port <relativePath>')
  .description(
    'Ports the react app in specified directory over into the current modular project as a modular app',
  )
  .action(async (relativePath) => {
    const { port } = await import('./port');
    await port(relativePath);
  });

program
  .command('lint [regexes...]')
  .option(
    '--all',
    'Only lint diffed files from your remote origin default branch (e.g. main or master)',
  )
  .option('--fix', 'Fix the lint errors wherever possible')
  .description('Lints the codebase')
  .action(async (regexes: string[], options: LintOptions) => {
    const { default: lint } = await import('./lint');
    await lint(options, regexes);
  });

program
  .command('typecheck')
  .description('Typechecks the entire project')
  .action(async () => {
    const { default: typecheck } = await import('./typecheck');
    await typecheck();
  });

void startupCheck()
  .then(() => {
    return program.parseAsync(process.argv);
  })
  .catch((err: Error & ExecaError) => {
    logger.error(err.message);
    if (err.stack) {
      logger.debug(err.stack);
    }
    process.exit(err.exitCode || process.exitCode || 1);
  });
