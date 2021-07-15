import stripAnsi from 'strip-ansi';
import execa from 'execa';
import getModularRoot from './getModularRoot';

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

export function stashChanges(): void {
  execa.sync('git', ['stash', '-u']);
  throw new Error('Failed to perform action cleanly. Stashing git changes...');
}

function getGitDefaultBranch() {
  const result = execa.sync('git', [
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
  ]);
  return stripAnsi(result.stdout).split('/').pop() || 'master';
}

function getModifiedAndUntrackedFileChanges() {
  const lsFiles = execa.sync('git', ['ls-files', '-mo', '--exclude-standard'], {
    cwd: getModularRoot(),
  });
  return stripAnsi(lsFiles.stdout).split('\n');
}

function getGitDiff() {
  const defaultBranch = getGitDefaultBranch();
  const sha = execa.sync('git', ['merge-base', 'HEAD', defaultBranch], {
    cwd: getModularRoot(),
  });
  const diff = execa.sync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACMRTUB', sha.stdout],
    {
      cwd: getModularRoot(),
    },
  );
  return stripAnsi(diff.stdout).split('\n');
}

export function getChangedFiles(): string[] {
  return Array.from(
    new Set([
      ...getModifiedAndUntrackedFileChanges(),
      ...getGitDiff(),
    ]).values(),
  );
}
