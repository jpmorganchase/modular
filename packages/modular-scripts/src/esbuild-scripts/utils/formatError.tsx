import { Message } from 'esbuild';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import codeFrame from 'babel-code-frame';

export async function formatError(error: Message): Promise<string> {
  if (error.location?.file) {
    const source = await fs.readFile(error.location.file, {
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
    return `This is a bad error ... lol\n`;
  }
}
