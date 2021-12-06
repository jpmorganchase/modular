import { Message } from 'esbuild';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { codeFrameColumns } from '@babel/code-frame';

export async function formatError(
  error: Message,
  baseDir: string = process.cwd(),
): Promise<string> {
  if (error.location?.file) {
    const pathToFile = path.join(baseDir, error.location?.file);
    const source = await fs.readFile(pathToFile, {
      encoding: 'utf-8',
    });
    return `${chalk.red('Error:')}[${error.location.file}] ${error.text}
  
${codeFrameColumns(
  source,
  { start: { line: error.location.line, column: error.location.column } },
  {
    highlightCode: true,
  },
)}
    `;
  } else {
    return `${chalk.red('Error:')} ${error.text}\n`;
  }
}
