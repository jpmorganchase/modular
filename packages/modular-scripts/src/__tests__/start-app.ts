import execa from 'execa';

import getModularRoot from '../utils/getModularRoot';
import * as logger from '../utils/logger';

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('yarn', ['modular', ...str.split(' ')], {
    cwd: modularRoot,
    cleanup: true,
    ...opts,
  });
}

const modularRoot = getModularRoot();

const START_APP_TIMEOUT = 60 * 1000;
export interface DevServer {
  kill: () => void;
}

export async function startApp(
  appPath: string,
  opts: Record<string, unknown> = {},
): Promise<DevServer> {
  const devServer = modular(`start ${appPath}`, {
    cleanup: true,
    ...opts,
  });

  await new Promise((resolve, reject) => {
    if (!devServer.stdout) {
      return reject(
        new Error(
          'The dev server could not produce any output on /dev/stdout.',
        ),
      );
    }

    if (!devServer.stderr) {
      return reject(
        new Error(
          'The dev server could not produce any output on /dev/stderr.',
        ),
      );
    }

    // If the Promise has completed we need to bail out of any further handlers that
    // are executed, because otherwise we can end up trying to log after tests are done.
    // We use a 'completed' variable to do this -- in an ideal world we'd cleanup
    // the listeners.
    //
    // See: https://github.com/jpmorganchase/modular/pull/107#discussion_r493791918
    let completed = false;

    const startAppTimeout = setTimeout(() => {
      if (completed) return;

      completed = true;
      reject(
        new Error(
          `The app at ${appPath} never started within the configured ${START_APP_TIMEOUT}ms timeout period.`,
        ),
      );
    }, START_APP_TIMEOUT);

    devServer.stdout.on('data', (data: Buffer) => {
      if (completed) return;

      const output = data.toString();
      if (/Something is already running on port (\d+)./.test(output)) {
        clearTimeout(startAppTimeout);

        completed = true;
        return reject(new Error(output));
      }
      if (/Compiled successfully!/.test(output)) {
        clearTimeout(startAppTimeout);

        completed = true;
        return resolve(true);
      }
    });

    devServer.stderr.on('data', (data: Buffer) => {
      if (completed) return;

      const output = data.toString();

      logger.error(output);

      clearTimeout(startAppTimeout);

      completed = true;
      return reject(new Error(output));
    });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    devServer.on('error', (err: Error) => {
      if (completed) return;

      logger.error(String(err));
      logger.error(err.stack || '');

      clearTimeout(startAppTimeout);

      completed = true;
      reject(err);
    });
  });

  // We can't return the raw execa child process,
  // because we need to `await` until the dev server
  // starts above, but don't want to wait until the
  // process itself finishes.
  return {
    kill: () => {
      devServer.kill('SIGKILL');
      return devServer;
    },
  };
}
