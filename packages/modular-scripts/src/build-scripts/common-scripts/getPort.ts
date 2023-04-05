import isRoot from 'is-root';
import prompts from 'prompts';
import chalk from 'chalk';

import * as logger from '../../utils/logger';
import memoize from '../../utils/memoize';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const detect = require('detect-port-alt');

const isInteractive = process.stdout.isTTY;

export async function choosePort(
  host: string,
  defaultPort: number,
): Promise<number | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const port = (await detect(defaultPort, host)) as number;
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

const getPort = async (host: string) => {
  const port = await choosePort(host, parseInt(process.env.PORT || '3000', 0));
  if (port) {
    return port;
  } else {
    throw new Error(`Could not identify port to run against`);
  }
};

export default memoize(getPort);
