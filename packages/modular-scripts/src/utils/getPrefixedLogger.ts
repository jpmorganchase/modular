import * as logger from './logger';
import memoize from './memoize';

export type Logger = typeof logger;

function _getPrefixedLogger(target: string): Logger {
  const prefix = '$ ' + target + ':';

  return {
    clear: () => {
      logger.clear();
    },
    debug: (...args: Parameters<typeof logger.log>) => {
      logger.log(prefix, ...args);
    },
    log: (...args: Parameters<typeof logger.log>) => {
      return logger.log(prefix, ...args);
    },
    error: (...args: Parameters<typeof logger.error>) => {
      return logger.error(prefix, ...args);
    },
    warn: (...args: Parameters<typeof logger.error>) => {
      return logger.error(prefix, ...args);
    },
  };
}

export default memoize<Logger, (s: string) => Logger>(_getPrefixedLogger);
