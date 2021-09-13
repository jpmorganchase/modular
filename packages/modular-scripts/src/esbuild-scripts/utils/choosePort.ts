import detect from 'detect-port-alt';
import isRoot from 'is-root';
import prompts from 'prompts';
import chalk from 'chalk';

import * as logger from '../../utils/logger';

const isInteractive = process.stdout.isTTY;

export default async function choosePort(
  host: string,
  defaultPort: number,
): Promise<number | undefined> {
  const port = await detect(defaultPort, host);
  if (port === defaultPort) {
    return port;
  }
  const message =
    process.platform !== 'win32' && defaultPort < 1024 && !isRoot()
      ? `Admin permissions are required to run a server on a port below 1024.`
      : `Something is already running on port ${defaultPort}.`;

  if (isInteractive) {
    logger.clear();
    const answer = await prompts({
      type: 'confirm',
      name: 'shouldChangePort',
      message: chalk.yellow(
        message + '\n\nWould you like to run the app on another port instead?',
      ),
    });
    if (answer.shouldChangePort) {
      return port;
    } else {
      return undefined;
    }
  } else {
    logger.error(message);
  }
}
