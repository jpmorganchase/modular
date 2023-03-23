import isCI from 'is-ci';
import ts from 'typescript';
import chalk from 'chalk';
import getPackageMetadata from './utils/getPackageMetadata';
import * as logger from './utils/logger';
import getModularRoot from './utils/getModularRoot';
import actionPreflightCheck from './utils/actionPreflightCheck';
import { getAllWorkspaces } from './utils/getAllWorkspaces';
import { selectWorkspaces } from './utils/selectWorkspaces';

import type { JSONSchemaForTheTypeScriptCompilerSConfigurationFile as TSConfig } from '@schemastore/tsconfig';

type CompilerOptions = TSConfig['compilerOptions'];

export interface TypecheckOptions {
  ancestors: boolean;
  descendants: boolean;
  changed: boolean;
  compareBranch: string;
}

const COMPILER_OPTIONS_ALLOW_LIST: string[] = ['jsx'];
const DEFAULT_COMPILER_OPTIONS: CompilerOptions = {
  noEmit: true,
};
const DEFAULT_EXCLUDES: string[] = [
  'node_modules',
  'bower_components',
  'jspm_packages',
  'tmp',
  '**/dist-types',
  '**/dist-cjs',
  '**/dist-es',
  'dist',
  '**/__fixtures__',
];

function restrictUserTsconfig(
  userTsConfig: TSConfig,
  replaceInclude: string[] | undefined,
): TSConfig {
  const { compilerOptions, ...rest } = userTsConfig;

  // The exclude list here is different to that in getPackageInfo() because we want
  // to test more files during a typecheck compared to a build (test/spec files). During a build,
  // there might be various files that we don't want to end up in the output.
  const tsConfig: TSConfig = {
    ...rest,
    exclude: [...DEFAULT_EXCLUDES],
  };

  const combinedCompilerOptions: CompilerOptions = {
    ...DEFAULT_COMPILER_OPTIONS,
  };

  // Where the user has defined allowlist-supported compiler options, apply them
  for (const item of COMPILER_OPTIONS_ALLOW_LIST) {
    if (compilerOptions && compilerOptions[item]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      combinedCompilerOptions[item] = compilerOptions[item];
    }
  }

  tsConfig.compilerOptions = combinedCompilerOptions;

  // If the user provided selective options, use a computed `include` config instead of what is derived from tsconfig.json
  if (replaceInclude) {
    tsConfig.include = replaceInclude;
  }

  return tsConfig;
}

async function typecheck(
  options: TypecheckOptions,
  packages: string[],
): Promise<void> {
  const { ancestors, descendants, changed, compareBranch } = options;
  const isSelective = changed || ancestors || descendants || packages.length;
  const modularRoot = getModularRoot();
  const [allWorkspacePackages] = await getAllWorkspaces(modularRoot);
  const targets = isSelective ? packages : [...allWorkspacePackages.keys()];
  let replaceInclude: undefined | string[];

  if (isSelective) {
    const selectedTargets = await selectWorkspaces({
      targets,
      changed,
      compareBranch,
      descendants,
      ancestors,
    });

    const targetLocations: string[] = [];
    for (const [pkgName, pkg] of allWorkspacePackages) {
      if (selectedTargets.includes(pkgName)) {
        targetLocations.push(pkg.location);
      }
    }

    if (targetLocations.length) {
      replaceInclude = targetLocations;
    }
  }

  const { typescriptConfig } = await getPackageMetadata();
  const tsConfig = restrictUserTsconfig(typescriptConfig, replaceInclude);

  const diagnosticHost = {
    getCurrentDirectory: (): string => getModularRoot(),
    getNewLine: (): string => ts.sys.newLine,
    getCanonicalFileName: (file: string): string =>
      ts.sys.useCaseSensitiveFileNames ? file : toFileNameLowerCase(file),
  };

  // Parse all config except for compilerOptions
  const configParseResult = ts.parseJsonConfigFileContent(
    tsConfig,
    ts.sys,
    modularRoot,
  );

  if (configParseResult.errors.length > 0) {
    logger.error('Failed to parse your tsconfig.json');
    throw new Error(
      ts.formatDiagnostics(configParseResult.errors, diagnosticHost),
    );
  }

  const program = ts.createProgram(
    configParseResult.fileNames,
    configParseResult.options,
  );

  // Pulled from typescript's getCanonicalFileName logic
  // eslint-disable-next-line  no-useless-escape
  const fileNameLowerCaseRegExp = /[^\u0130\u0131\u00DFa-z0-9\\/:\-_\. ]+/g;

  function toFileNameLowerCase(x: string) {
    return fileNameLowerCaseRegExp.test(x)
      ? x.replace(fileNameLowerCaseRegExp, x.toLowerCase())
      : x;
  }

  program
    .getSourceFiles()
    .map((f) => f.fileName)
    .sort()
    .forEach((f) => {
      logger.debug(f);
    });

  // Does not emit files or typings but will add declaration diagnostics to our errors
  // This will ensure that makeTypings will be successful in CI before actually attempting to build
  const emitResult = program.emit();

  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  if (diagnostics.length) {
    if (isCI) {
      // formatDiagnostics will return a readable list of error messages, each with its own line
      throw new Error(ts.formatDiagnostics(diagnostics, diagnosticHost));
    }

    // formatDiagnosticsWithColorAndContext will return a list of errors, each with its own line
    // and provide an expanded snapshot of the line with the error
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, diagnosticHost),
    );
  }

  // "✓ Typecheck passed"
  logger.log(chalk.green('\u2713 Typecheck passed'));
}

export default actionPreflightCheck(typecheck);
