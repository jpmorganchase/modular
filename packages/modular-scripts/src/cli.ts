import { ExecaError } from 'execa';
import startupCheck from './utils/startupCheck';
import * as logger from './utils/logger';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
// See https://github.com/facebook/create-react-app/blob/f36d61a/packages/react-scripts/bin/react-scripts.js#L11-L16
process.on('unhandledRejection', (err) => {
  throw err;
});

void startupCheck()
  .then(async () => {
    const { program } = await import('./program');
    return program.parseAsync(process.argv);
  })
  .catch((err: Error & ExecaError) => {
    logger.error(err.message);
    if (err.stack) {
      logger.debug(err.stack);
    }
    process.exit(err.exitCode || process.exitCode || 1);
  });
