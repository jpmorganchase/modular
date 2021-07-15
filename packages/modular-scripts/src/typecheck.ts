import isCI from 'is-ci';
import path from 'path';
import ts from 'typescript';
import getPackageMetadata from './buildPackage/getPackageMetadata';
import { reportTSDiagnostics } from './buildPackage/reportTSDiagnostics';

export async function typecheck(): Promise<void> {
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

  if (isCI && diagnostics.length) {
    throw new Error(ts.formatDiagnostics(diagnostics, diagnosticHost));
  }
  if (diagnostics.length) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, diagnosticHost),
    );
  }
}
