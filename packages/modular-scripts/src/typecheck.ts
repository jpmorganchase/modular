import isCI from 'is-ci';
import path from 'path';
import ts from 'typescript';
import chalk from 'chalk';
import getPackageMetadata from './utils/getPackageMetadata';
import * as logger from './utils/logger';
import getModularRoot from './utils/getModularRoot';
import actionPreflightCheck from './utils/actionPreflightCheck';

async function typecheck(): Promise<void> {
  const { typescriptConfig } = await getPackageMetadata();

  const { _compilerOptions, ...rest } = typescriptConfig;

  const tsConfig = {
    ...rest,
    exclude: [
      'node_modules',
      'bower_components',
      'jspm_packages',
      'tmp',
      '**/dist-types',
      '**/dist-cjs',
      '**/dist-es',
      'dist',
    ],
    compilerOptions: {
      noEmit: true,
    },
  };

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
    path.dirname('tsconfig.json'),
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
