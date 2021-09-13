import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

import * as logger from './logger';

export default async function checkRequiredFiles(
  files: string[],
): Promise<void> {
  let currentFilePath: string = files[0];
  try {
    for (const filePath of files) {
      currentFilePath = filePath;
      await fs.access(filePath, fs.constants.F_OK);
    }
  } catch (err) {
    const dirName = path.dirname(currentFilePath);
    const fileName = path.basename(currentFilePath);
    logger.log(chalk.red('Could not find a required file.'));
    logger.log(chalk.red('  Name: ') + chalk.cyan(fileName));
    logger.log(chalk.red('  Searched in: ') + chalk.cyan(dirName));
    throw new Error(`Could not find ${fileName}`);
  }
}
