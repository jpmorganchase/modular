import execa from 'execa';
import chalk from 'chalk';
import * as logger from './logger';

export default function execSync(
  file: string,
  args: string[],
  options: { log?: boolean } & execa.SyncOptions = { log: true },
): execa.ExecaSyncReturnValue<string> {
  const { log, ...opts } = options;
  if (log) {
    logger.log(chalk.grey(`$ ${file} ${args.join(' ')}`));
  }
  return execa.sync(file, args, {
    stdin: process.stdin,
    stderr: process.stderr,
    stdout: process.stdout,
    cleanup: true,
    ...opts,
  });
}
