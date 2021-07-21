import * as ts from 'typescript';
import { getLogger } from '../buildPackage/getLogger';

// from https://github.com/Microsoft/TypeScript/issues/6387
// a helper to output a readable message from a ts diagnostics object
export function reportTSDiagnostics(
  packagePath: string,
  diagnostics: ts.Diagnostic[],
): void {
  const logger = getLogger(packagePath);

  diagnostics.forEach((diagnostic) => {
    let message = `Error`;
    if (diagnostic.file) {
      const where = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start as number,
      );
      message += ` ${diagnostic.file.fileName} ${where.line}, ${
        where.character + 1
      }`;
    }
    message +=
      ': ' + ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    logger.error(message);
  });
}
