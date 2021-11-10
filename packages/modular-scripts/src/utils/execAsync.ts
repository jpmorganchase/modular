import execa from 'execa';
import chalk from 'chalk';
import * as logger from './logger';

export default function execSync(
  file: string,
  args: string[],
  options: { log?: boolean } & execa.SyncOptions = { log: true },
): execa.ExecaChildProcess<string> {
  const { log, ...opts } = options;
  if (log) {
    logger.log(chalk.grey(`$ ${file} ${args.join(' ')}`));
  }
  return execa(file, args, {
    stdin: process.stdin,
    stderr: process.stderr,
    stdout: process.stdout,
    cleanup: true,
    ...opts,
  });
}
