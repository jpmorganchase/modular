import chalk from 'chalk';

import memoize from '../../../utils/memoize';
import * as logger from '../../../utils/logger';
import { getConfig } from '../../../utils/config';

const getHost = memoize(() => {
  const HOST = getConfig('host') as string;
  if (HOST !== '0.0.0.0') {
    logger.log(
      chalk.cyan(
        `Attempting to bind to HOST environment variable: ${chalk.yellow(
          chalk.bold(HOST),
        )}`,
      ),
    );
    logger.log(
      `If this was unintentional, check that you haven't mistakenly set it in your shell.`,
    );
    logger.log(
      `Learn more here: ${chalk.yellow('https://cra.link/advanced-config')}`,
    );
    logger.log();
  }
  return HOST;
});

export default getHost;
