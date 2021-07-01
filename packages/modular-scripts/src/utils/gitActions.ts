import stripAnsi from 'strip-ansi';
import execa from 'execa';

export function cleanGit(cwd: string): boolean {
  const trackedChanged = stripAnsi(
    execa.sync('git', ['status', '-s'], {
      all: true,
      reject: false,
      cwd,
      cleanup: true,
    }).stdout,
  );
  return trackedChanged.length === 0;
}

export function resetChanges(): void {
  execa.sync('git', ['clean', '-fd']);
  throw new Error('Failed to perform action cleanly. Reverting git changes...');
}
