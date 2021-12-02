import chalk from 'chalk';

import memoize from '../../../utils/memoize';
import * as logger from '../../../utils/logger';

const getHost = memoize(() => {
  if (process.env.HOST) {
    logger.log(
      chalk.cyan(
        `Attempting to bind to HOST environment variable: ${chalk.yellow(
          chalk.bold(process.env.HOST),
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
  return process.env.HOST || '0.0.0.0';
});

export default getHost;
