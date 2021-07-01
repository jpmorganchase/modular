import * as logger from '../utils/logger';

type Console = {
  log: typeof logger.log;
  error: typeof logger.error;
};
const consoles: { [name: string]: Console } = {};

export function getLogger(directoryName: string): Console {
  if (!consoles[directoryName]) {
    consoles[directoryName] = {
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
