#!/usr/bin/env node

import * as fs from 'fs-extra';
import isCI from 'is-ci';
import chalk from 'chalk';
import commander from 'commander';
import type { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import type { TestOptions } from './test';
import type { LintOptions } from './lint';

import actionPreflightCheck from './utils/actionPreflightCheck';
import * as logger from './utils/logger';

const program = new commander.Command('modular');
program.version(
  (
    fs.readJsonSync(
      require.resolve('modular-scripts/package.json'),
    ) as PackageJson
  ).version as string,
);

program
  .command('add')
  .description(`Add a new package into the modular workspace.`)
  .argument('[package-name]', 'Package name for the package.json')
  .option(
    '--unstable-type <type>',
    "Type of the package ('app', 'view', 'package')",
  )
  .option('--unstable-name <name>', 'Package name for the package.json')
  .option('--template <name>', 'Template name')
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
        template?: string;
        preferOffline?: boolean;
        verbose?: boolean;
        unstableName?: string;
      },
    ) => {
      const { default: addPackage } = await import('./addPackage');
      return addPackage({
        name: packageName,
        type: addOptions.unstableType,
        template: addOptions.template,
        preferOffline: addOptions.preferOffline,
        verbose: addOptions.verbose,
        unstableName: addOptions.unstableName,
      });
    },
  );

program
  .command('analyze <package-name>')
  .description(`Analyze the dependencies of a package.`)
  .action(async (packageName: string) => {
    const { default: analyze } = await import('./analyze');
    return analyze({
      target: packageName,
    });
  });

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
  .option('--verbose', 'Run yarn commands with --verbose set')
  .option('--private', 'Enable the building of private packages', false)
  .action(
    async (
      packagePaths: string[],
      options: {
        preserveModules: string;
        private: boolean;
      },
    ) => {
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
    '--ancestors',
    'Additionally run tests for workspaces that depend on workspaces that have changed',
    false,
  )
  .option(
    '--debug',
    'Setup node.js debugger on the test process - equivalent of setting --inspect-brk on a node.js process',
    false,
  )
  .option(
    '--changed <branch>',
    'Run tests only for workspaces that have changed compared to the branch specified',
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
    if (options.ancestors && !options.changed) {
      process.stderr.write(
        "Option --ancestors doesn't make sense without option --changed",
      );
      process.exit(1);
    }
    if (options.changed && regexes.length) {
      process.stderr.write(
        'Option --changed conflicts with supplied test regex',
      );
      process.exit(1);
    }

    const { default: test } = await import('./test');

    // proxy simplified options to testOptions
    const { U, ...testOptions } = options;
    testOptions.updateSnapshot = !!(options.updateSnapshot || U);

    console.log(testOptions);

    return test(testOptions, regexes);
  });

program
  .command('start [packageName]')
  .description(
    `Start a dev-server for an app. Only available for modular 'app' types.`,
  )
  .option('--verbose', 'Run yarn commands with --verbose set')
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
  .option('--fix', 'Run autofixers which are available.')
  .option('--verbose', 'Run yarn commands with --verbose set')
  .action(async ({ fix }: { fix: boolean }) => {
    const { check } = await import('./check');
    await check({ fix });
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
  .option('--verbose', 'Enables verbose logging within modular.')
  .action(async () => {
    const { default: typecheck } = await import('./typecheck');
    await typecheck();
  });

program
  .command('rename <oldPackageName> <newPackageName>')
  .description(`Rename a package.`)
  .option('--verbose', 'Enables verbose logging within modular.')
  .action(async (oldPackageName: string, newPackageName: string) => {
    const { default: rename } = await import('./rename');
    await rename(oldPackageName, newPackageName);
  });

interface ServeOptions {
  port: string;
}

program
  .command('serve <target>')
  .description('Serves a pre-built modular app')
  .option('--port <value>', 'Port to serve on', '3000')
  .action(async (packageName: string, options: ServeOptions) => {
    const { default: serve } = await import('./serve');
    await serve(packageName, parseInt(options.port, 10));
  });

export { program };
