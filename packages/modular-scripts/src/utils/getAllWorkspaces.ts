import execa from 'execa';
import memoize from './memoize';
import getModularRoot from './getModularRoot';
import * as logger from './logger';
import stripAnsi from 'strip-ansi';

interface YarnWorkspace {
  location: string;
  workspaceDependencies: string[];
  mismatchedWorkspaceDependencies: string[];
}

type YarnWorkspaces = Record<string, YarnWorkspace>;

export async function getYarnWorkspaceInfo(
  cwd: string,
): Promise<YarnWorkspaces> {
  const result = await execa('yarnpkg', ['--silent', 'workspaces', 'info'], {
    cwd,
    reject: false,
    cleanup: true,
  });

  const { exitCode, stdout, stderr } = result;

  if (stderr && !!exitCode) {
    logger.error(stderr);
    throw new Error(`Failed to lookup yarn workspace information`);
  }

  // strip out ANSI color codes and escape characters
  const strippedStd =
    stripAnsi(
      stdout,
      // there's an edge case where if there are no packages in the current workspace
      // then this command returns an empty string and no JSON - so we have to default
      // to an empty directory which can be JSON parsed.
    ) || '{}';

  return JSON.parse(strippedStd) as YarnWorkspaces;
}

function _getAllWorkspaces(): Promise<YarnWorkspaces> {
  const modularRoot = getModularRoot();

  return getYarnWorkspaceInfo(modularRoot);
}

export const getAllWorkspaces = memoize(_getAllWorkspaces);
