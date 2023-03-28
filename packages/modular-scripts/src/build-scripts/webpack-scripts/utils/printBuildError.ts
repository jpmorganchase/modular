import chalk from 'chalk';
import * as console from '../../../utils/logger';

export default function printBuildError(err: Error) {
  const message = err != null && err.message;
  const stack = err != null && err.stack;

  // Add more helpful message for Terser error
  if (
    stack &&
    typeof message === 'string' &&
    message.indexOf('from Terser') !== -1
  ) {
    try {
      const matched = /(.+)\[(.+):(.+),(.+)\]\[.+\]/.exec(stack);
      if (!matched) {
        throw new Error('Using errors for control flow is bad.');
      }
      const problemPath = matched[2];
      const line = matched[3];
      const column = matched[4];
      console.log(
        'Failed to minify the code from this file: \n\n',
        chalk.yellow(
          `\t${problemPath}:${line}${column !== '0' ? ':' + column : ''}`,
        ),
        '\n',
      );
    } catch (ignored) {
      console.log('Failed to minify the bundle.', err.message);
    }
    console.log('Read more here: https://cra.link/failed-to-minify');
  } else {
    console.log((message || JSON.stringify(err)) + '\n');
  }
  console.log();
}
