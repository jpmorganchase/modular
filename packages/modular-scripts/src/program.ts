#!/usr/bin/env node

import * as fs from 'fs-extra';
import isCI from 'is-ci';
import chalk from 'chalk';
import commander, { Option } from 'commander';
import { testOptions } from './test/jestOptions';
import actionPreflightCheck from './utils/actionPreflightCheck';
import * as logger from './utils/logger';
import {
  computeConcurrencyOption,
  validateCompareOptions,
} from './utils/options';
import type { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import type { TestOptions } from './test';
import type { LintOptions } from './lint';
import type { TypecheckOptions } from './typecheck';

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
  .option('--path <targetPath>', 'Target root directory for the package')
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
        path?: string;
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
        path: addOptions.path,
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
  .command('build [packages...]')
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
  .option(
    '--changed',
    'Build only for workspaces that have changed compared to the branch specified in --compareBranch',
    false,
  )
  .option(
    '--descendants',
    'Additionally build workspaces that the specified packages directly or indirectly depend on (can be combined with --changed)',
    false,
  )
  .option(
    '--ancestors',
    'Additionally build workspaces that directly or indirectly depend on the specified packages (can be combined with --changed)',
    false,
  )
  .option(
    '--compareBranch <branch>',
    "Specifies the branch to use with the --changed flag. If not specified, Modular will use the repo's default branch",
  )
  .option(
    '--dangerouslyIgnoreCircularDependencies',
    "Ignore circular dependency checks if your graph has one or more circular dependencies involving 'source' types, then warn. The build will still fail if circular dependencies involve more than one buildable package. Circular dependencies can be always refactored to remove cycles. This switch is dangerous and should be used sparingly and only temporarily.",
    false,
  )
  .option(
    '--concurrencyLevel <level>',
    'Limit the concurrency of build processes that are executed in parallel within batches. 0 or 1 means no concurrency. Default is the number of logical CPUs.',
  )
  .action(
    async (
      packagePaths: string[],
      options: {
        preserveModules: string;
        private: boolean;
        changed: boolean;
        compareBranch?: string;
        ancestors: boolean;
        descendants: boolean;
        dangerouslyIgnoreCircularDependencies: boolean;
        concurrencyLevel?: string;
      },
    ) => {
      const { default: build } = await import('./build-scripts');

      validateCompareOptions(options.compareBranch, options.changed);

      const concurrencyLevel = computeConcurrencyOption(
        options.concurrencyLevel,
      );

      logger.debug(
        `Running build with a concurrency level of ${concurrencyLevel}`,
      );

      if (options.dangerouslyIgnoreCircularDependencies) {
        // Warn. Users should never use this, but if they use it, they should have cycles limited to "source" packages
        // and they should do this in a temporary way (for example, to onboard large projects).
        logger.warn(
          `You chose to dangerously ignore cycles in the dependency graph. Builds will still fail if a cycle is found involving two or more buildable packages. Please note that the use of this flag is not recommended. It's always possible to break a cyclic dependency by creating an additional dependency that contains the common code.`,
        );
      }

      await build({
        packagePaths,
        preserveModules: JSON.parse(options.preserveModules) as boolean,
        private: options.private,
        changed: options.changed,
        compareBranch: options.compareBranch,
        ancestors: options.ancestors,
        descendants: options.descendants,
        dangerouslyIgnoreCircularDependencies:
          options.dangerouslyIgnoreCircularDependencies,
        concurrencyLevel,
      });
    },
  );

interface CLITestOptions extends TestOptions {
  U: boolean;
}

program
  .command('test [packages...]')
  .option(
    '--bypass',
    'Bypass all modular specific selective behavior and pass all flags and options directly to Jest, except for --verbose, --swc & --env which can be used with --bypass. Ensures modular test behaves exactly like calling Jest directly, but with Modular configuration applied. Use with IntelliJ Jest configurations.',
    false,
  )
  .option(
    '--swc',
    'Use Rust based SWC Jest runner instead of ts-jest & babel for performance improvements',
    false,
  )
  .option(
    '--ancestors',
    'Additionally run tests for workspaces that depend on workspaces that have changed',
    false,
  )
  .option(
    '--descendants',
    'Additionally run tests for workspaces that directly or indirectly depend on the specified packages (can be combined with --changed)',
    false,
  )
  .option(
    '--debug',
    'Setup node.js debugger on the test process - equivalent of setting --inspect-brk on a node.js process',
    false,
  )
  .option(
    '--changed',
    'Run tests only for workspaces that have changed compared to the branch specified in --compareBranch',
  )
  .option(
    '--compareBranch <branch>',
    "Specifies the branch to use with the --changed flag. If not specified, Modular will use the repo's default branch",
  )
  .option(
    '--regex <regexes...>',
    'Specifies one or more test name regular expression. When combined with selective options, it will run tests matching the regex as well as those matching the selective options',
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
  .option('--watchAll [value]', testOptions.watchAll.description, false)
  .option('--bail [value]', testOptions.bail.description, isCI)
  .option('--clearCache', testOptions.clearCache.description)
  .option('--logHeapUsage', testOptions.logHeapUsage.description)
  .option('--no-cache', testOptions.cache.description)
  .allowUnknownOption()
  .description('Run tests over the codebase')
  .action(async (packages: string[], options: CLITestOptions) => {
    validateCompareOptions(options.compareBranch, options.changed);

    const { default: test } = await import('./test');

    // proxy simplified options to testOptions
    const { U, ...testOptions } = options;
    testOptions.updateSnapshot = !!(options.updateSnapshot || U);

    return test(testOptions, packages);
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

const lintStagedFlag = '--staged';
program
  .command('lint [packages...]')
  .description(
    'lint provided packages. When run without any arguments, lints the whole repository',
  )
  .option(
    '--regex [regexes...]',
    'Only lint packages matching the provided regexes',
  )
  .option(
    '--ancestors',
    'Additionally lint workspaces that depend on workspaces that have changed',
    false,
  )
  .option(
    '--descendants',
    'Additionally lint workspaces that directly or indirectly depend on the specified packages',
    false,
  )
  .option(
    '--changed',
    'Additionally lint workspaces that have changed compared to the branch specified in --compareBranch',
  )
  .option(
    '--compareBranch <branch>',
    "Specifies the branch to use with the --changed flag. If not specified, Modular will use the repo's default branch",
  )
  .option(
    '--fix',
    `Fix the lint errors wherever possible, restages changes if run with ${lintStagedFlag}`,
  )
  .option('--verbose', 'Enables verbose logging within modular.')
  .option(
    '--diff',
    'Only lint files that have changed compared to the compare branch',
  )
  .addOption(
    new Option(
      lintStagedFlag,
      'Only lint files that have been staged to be committed',
    ).conflicts('all'),
  )
  .description('Lints the codebase')
  .action(async (packages: string[], options: LintOptions) => {
    const { default: lint } = await import('./lint');
    await lint(options, packages);
  });

program
  .command('typecheck [packages...]')
  .description(
    'Typecheck provided packages. If run without any additional arguments, typechecks the entire project',
  )
  .option('--verbose', 'Enables verbose logging within modular.')
  .option(
    '--ancestors',
    'Additionally run typecheck for workspaces that depend on workspaces that have changed',
    false,
  )
  .option(
    '--descendants',
    'Additionally run typecheck for workspaces that directly or indirectly depend on the specified packages (can be combined with --changed)',
    false,
  )
  .option(
    '--changed',
    'Run typecheck only for workspaces that have changed compared to the branch specified in --compareBranch',
  )
  .option(
    '--compareBranch <branch>',
    "Specifies the branch to use with the --changed flag. If not specified, Modular will use the repo's default branch",
  )
  .action(async (packages: string[], options: TypecheckOptions) => {
    validateCompareOptions(options.compareBranch, options.changed);

    const { default: typecheck } = await import('./typecheck');
    await typecheck(options, packages);
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

program
  .command('select [packages...]')
  .description(
    'Returns an array of selected package names by filtering all workspaces by the packages and options provided',
  )
  .option('--verbose', 'Show verbose information')
  .option(
    '--buildable',
    'Select packages and output them in build order as 1-level nested arrays. Default is false',
    false,
  )
  .option(
    '--changed',
    'Select only packages that contain files that have changed compared to the branch specified in --compareBranch. Default is false',
    false,
  )
  .option(
    '--descendants',
    'Additionally select packages that the specified packages directly or indirectly depend on. Default is false',
    false,
  )
  .option(
    '--ancestors',
    'Additionally select packages that directly or indirectly depend on the specified packages. Default is false',
    false,
  )
  .option(
    '--compareBranch <branch>',
    "Specifies the branch to use with the --changed flag. If not specified, Modular will use the repo's default branch",
  )
  .action(
    async (
      selectedPackages: string[],
      options: {
        changed: boolean;
        compareBranch?: string;
        ancestors: boolean;
        descendants: boolean;
        buildable: boolean;
      },
    ) => {
      const { default: select } = await import('./select');
      validateCompareOptions(options.compareBranch, options.changed);
      await select({ ...options, selectedPackages });
    },
  );

export { program };
