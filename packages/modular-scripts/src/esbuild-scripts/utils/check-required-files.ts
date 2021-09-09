import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

import * as logger from '../../utils/logger';

export default function checkRequiredFiles(files: string[]): boolean {
  let currentFilePath: string = files[0];
  try {
    files.forEach((filePath) => {
      currentFilePath = filePath;
      fs.accessSync(filePath, fs.constants.F_OK);
    });
    return false;
  } catch (err) {
    const dirName = path.dirname(currentFilePath);
    const fileName = path.basename(currentFilePath);
    logger.log(chalk.red('Could not find a required file.'));
    logger.log(chalk.red('  Name: ') + chalk.cyan(fileName));
    logger.log(chalk.red('  Searched in: ') + chalk.cyan(dirName));
    return true;
  }
}
