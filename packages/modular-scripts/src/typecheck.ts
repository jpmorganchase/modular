import isCI from 'is-ci';
import path from 'path';
import ts from 'typescript';
import chalk from 'chalk';
import getPackageMetadata from './buildPackage/getPackageMetadata';
import { reportTSDiagnostics } from './buildPackage/reportTSDiagnostics';
import * as logger from './utils/logger';

export async function typecheck(silent: boolean): Promise<void> {
  const { typescriptConfig } = await getPackageMetadata();

  const { _compilerOptions, ...tsConfig } = typescriptConfig;

  // Parse all config except for compilerOptions
  const configParseResult = ts.parseJsonConfigFileContent(
    tsConfig,
    ts.sys,
    path.dirname('tsconfig.json'),
  );

  if (configParseResult.errors.length > 0) {
    reportTSDiagnostics(':root', configParseResult.errors);
    throw new Error('Could not parse Typescript configuration');
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

  const diagnosticHost = {
    getCurrentDirectory: (): string => ts.sys.getCurrentDirectory(),
    getNewLine: (): string => ts.sys.newLine,
    getCanonicalFileName: (file: string): string =>
      ts.sys.useCaseSensitiveFileNames ? file : toFileNameLowerCase(file),
  };

  if (diagnostics.length) {
    if (silent) {
      throw new Error('\u0078 Typecheck did not pass');
    }

    if (isCI) {
      throw new Error(ts.formatDiagnostics(diagnostics, diagnosticHost));
    }

    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, diagnosticHost),
    );
  }

  logger.log(chalk.green('\u2713 Typecheck passed'));
}
