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
    execa.sync('yarnpkg', ['workspaces', 'info'], {
      all: true,
      reject: false,
      cwd: modularRoot,
      cleanup: true,
    }).stdout,
  );
  // For when the stdout includes the command in at the start of the string
  // Or when the stdout includes the "Done in <time>" at the end
  const startJson = strippedStd.indexOf('{');
  const hasDoneConsole = strippedStd.indexOf('Done');
  const endJson = hasDoneConsole > 0 ? hasDoneConsole - 1 : undefined;
  return JSON.parse(strippedStd.slice(startJson, endJson)) as YarnWorkspaces;
}

export const getAllWorkspaces = memoize(_getAllWorkspaces);
