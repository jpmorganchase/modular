import { Message } from 'esbuild';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import codeFrame from 'babel-code-frame';

export async function formatError(
  error: Message,
  baseDir: string = process.cwd(),
): Promise<string> {
  if (error.location?.file) {
    const pathToFile = path.join(baseDir, error.location?.file);
    console.log('Getting error from', pathToFile);
    const source = await fs.readFile(pathToFile, {
      encoding: 'utf-8',
    });
    return `${chalk.red('Error:')}[${error.location.file}] ${error.text}
  
${codeFrame(source, error.location.line, error.location.column, {
  linesAbove: 1,
  linesBelow: 1,
  highlightCode: true,
})}
    `;
  } else {
    return `${chalk.red('Error:')} ${error.text}\n`;
  }
}
