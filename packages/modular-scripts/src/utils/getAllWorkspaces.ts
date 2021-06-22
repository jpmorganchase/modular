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

export function getYarnWorkspaceInfo(cwd: string): YarnWorkspaces {
  // strip out ANSI color codes and escape characters
  const strippedStd =
    stripAnsi(
      execa.sync('yarnpkg', ['--silent', 'workspaces', 'info'], {
        all: true,
        reject: false,
        cwd,
        cleanup: true,
      }).stdout,
    ) || '{}';

  return JSON.parse(strippedStd) as YarnWorkspaces;
}

function _getAllWorkspaces(): YarnWorkspaces {
  const modularRoot = getModularRoot();

  return getYarnWorkspaceInfo(modularRoot);
}

export const getAllWorkspaces = memoize(_getAllWorkspaces);
