import isCI from 'is-ci';
import path from 'path';
import ts from 'typescript';
import chalk from 'chalk';
import getPackageMetadata from './utils/getPackageMetadata';
import * as logger from './utils/logger';
import getModularRoot from './utils/getModularRoot';

export async function typecheck(silent: boolean): Promise<void> {
  const { typescriptConfig } = await getPackageMetadata();

  const { _compilerOptions, ...tsConfig } = typescriptConfig;

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

  const diagnostics = ts.getPreEmitDiagnostics(program) as ts.Diagnostic[];

  if (diagnostics.length) {
    if (silent) {
      // "x Typecheck did not pass"
      throw new Error('\u0078 Typecheck did not pass');
    }

    if (isCI) {
      // formatDiagnostics will return a readable list of error messages, each with its own line
      throw new Error(ts.formatDiagnostics(diagnostics, diagnosticHost));
    }

    throw new Error(
      // formatDiagnosticsWithColorAndContext will return a list of errors, each with its own line
      // and provide an expanded snapshot of the line with the error
      ts.formatDiagnosticsWithColorAndContext(diagnostics, diagnosticHost),
    );
  }

  // "✓ Typecheck passed"
  logger.log(chalk.green('\u2713 Typecheck passed'));
}
