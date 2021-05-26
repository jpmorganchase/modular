import execa from 'execa';
import memoize from './memoize';
import getModularRoot from './getModularRoot';

interface YarnWorkspace {
  location: string;
  workspaceDependencies: string[];
  mismatchedWorkspaceDependencies: string[];
}

type YarnWorkspaces = Record<string, YarnWorkspace>;

function _getAllWorkspaces(): YarnWorkspaces {
  const modularRoot = getModularRoot();
  return JSON.parse(
    execa.sync('yarnpkg', ['--silent', 'workspaces', 'info'], {
      all: true,
      reject: false,
      cwd: modularRoot,
      cleanup: true,
    }).stdout,
  ) as YarnWorkspaces;
}

export const getAllWorkspaces = memoize(_getAllWorkspaces);
