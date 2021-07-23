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

function getGitLocalDefaultBranch(): string {
  try {
    // this config may be set to a different default branch (e.g. main)
    const result = execa.sync('git', ['config', 'init.defaultBranch']);
    return stripAnsi(result.stdout);
  } catch (_err) {
    // if there init.defaultBranch hasn't been set, the default is master
    return 'master';
  }
}

function getGitDefaultBranch(): string {
  try {
    const result = execa.sync('git', [
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
    ]);
    return `origin/${stripAnsi(result.stdout).split('/').pop() as string}`;
  } catch (err) {
    // no remote origin, look into git config for init.defaultBranch setting
    return getGitLocalDefaultBranch();
  }
}

function getModifiedAndUntrackedFileChanges(): string[] {
  // get all modified and untracked files, excluding the standard Git exclusion sources
  const lsFiles = execa.sync('git', ['ls-files', '-mo', '--exclude-standard'], {
    cwd: getModularRoot(),
  });
  if (lsFiles.stdout.length) {
    return stripAnsi(lsFiles.stdout).split('\n');
  }
  return [];
}

// Get all diffed files from git remote origin HEAD
function getGitDiff(): string[] {
  const defaultBranch = getGitDefaultBranch();
  // get a commit sha between the HEAD of the current branch and git remote origin HEAD
  const sha = execa.sync('git', ['merge-base', 'HEAD', defaultBranch], {
    cwd: getModularRoot(),
  });

  /**
   * diff-filter=ACMRTUB
   * (A) Added
   * (C) Copied
   * (M) Modified
   * (R) Renamed
   * (T) Type (i.e. regular file, symlink, submodule, …​) changed
   * (U) Unmerged
   * (B) Broken pairing (file that has had at least a certain percentage of its content deleted or changed)
   */
  const diff = execa.sync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACMRTUB', sha.stdout],
    {
      cwd: getModularRoot(),
    },
  );
  if (diff.stdout.length) {
    return stripAnsi(diff.stdout).split('\n');
  }
  return [];
}

export function getDiffedFiles(): string[] {
  return Array.from(
    new Set([
      ...getGitDiff(),
      ...getModifiedAndUntrackedFileChanges(),
    ]).values(),
  );
}
