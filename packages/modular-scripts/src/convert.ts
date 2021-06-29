import execa from 'execa';
import stripAnsi from 'strip-ansi';

export function cleanGit(cwd: string = process.cwd()): void {
  const trackedChanged = stripAnsi(
    execa.sync('git', ['status', '-s'], {
      all: true,
      reject: false,
      cwd,
      cleanup: true,
    }).stdout,
    // there's an edge case where if there are no packages in the current workspace
    // then this command returns an empty string and no JSON - so we have to default
    // to an empty directory which can be JSON parsed.
  );
  console.log('\n length: ', trackedChanged.length, '\n');
  console.log('\n here: ', trackedChanged, '\n');
}

export function convert(): void {
  cleanGit();
  return;
}
