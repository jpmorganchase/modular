import * as logger from '../utils/logger';

export type Console = {
  debug: typeof logger.debug;
  log: typeof logger.log;
  error: typeof logger.error;
};

export const consoles: { [name: string]: Console } = {};

export function getLogger(directoryName: string): Console {
  if (!consoles[directoryName]) {
    consoles[directoryName] = {
      debug: (...args: Parameters<typeof logger.debug>) => {
        return logger.debug('$ ' + directoryName + ':', ...args);
      },
      log: (...args: Parameters<typeof logger.log>) => {
        return logger.log('$ ' + directoryName + ':', ...args);
      },
      error: (...args: Parameters<typeof logger.error>) => {
        return logger.error('$ ' + directoryName + ':', ...args);
      },
    };
  }
  return consoles[directoryName];
}
