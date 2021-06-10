import execa from 'execa';
import memoize from './memoize';
import getModularRoot from './getModularRoot';
import stripAnsi from 'strip-ansi';

interface YarnWorkspace {
  location: string;
  workspaceDependencies: string[];
  mismatchedWorkspaceDependencies: string[];
}

type YarnWorkspaces = Record<string, YarnWorkspace>;

function _getAllWorkspaces(): YarnWorkspaces {
  const modularRoot = getModularRoot();

  // strip out ANSI color codes and escape characters
  const strippedStd = stripAnsi(
    execa.sync('yarnpkg', ['--silent', 'workspaces', 'info'], {
      all: true,
      reject: false,
      cwd: modularRoot,
      cleanup: true,
    }).stdout,
  );

  return JSON.parse(strippedStd) as YarnWorkspaces;
}

export const getAllWorkspaces = memoize(_getAllWorkspaces);
