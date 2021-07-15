import isCI from 'is-ci';
import execa from 'execa';
import getModularRoot from './utils/getModularRoot';

export async function typecheck(): Promise<void> {
  const options = ['--pretty'];
  if (isCI) {
    options.push('--noEmit');
  }
  await execa('tsc', options, {
    cwd: getModularRoot(),
  });
}
