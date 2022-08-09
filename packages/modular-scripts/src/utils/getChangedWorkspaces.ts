import path from 'path';
import pkgUp from 'pkg-up';
import { getDiffedFiles } from './gitActions';
import { getAllWorkspaces } from './getAllWorkspaces';
import getModularRoot from './getModularRoot';
import { WorkspaceMap } from '@modular-scripts/modular-types';

// Gets a list of changed files, then maps them to their workspace and returns a reduced subsection of WorkspaceMap
export async function getChangedWorkspaces(): Promise<WorkspaceMap> {
  const diffedFiles = getDiffedFiles();
  const workspaces = await getAllWorkspaces();
  const modularRoot = getModularRoot();

  // Resolve all the nearest package.json to each of the changed files. The resulting list can contain duplicates and null holes
  const packageManifetsPaths = await Promise.all(
    diffedFiles.map((changedFile) => pkgUp({ cwd: path.dirname(changedFile) })),
  );

  return matchWorkspaces(packageManifetsPaths, modularRoot, workspaces);
}

// Match paths to manifest.json to a reduced WorkspaceMap. This function works completely in memory and is test-friendly
export function matchWorkspaces(
  packagePaths: (string | null)[],
  root: string,
  workspaces: WorkspaceMap,
): WorkspaceMap {
  const workspaceEntries = Object.entries(workspaces);

  // Map a list of manifest files to a list of (possibly duplicated) root directories relative to the modular root for comparison with the workspace info
  const packageDirs = packagePaths.map(
    (packagePath) =>
      packagePath && path.relative(root, path.dirname(packagePath)),
  );

  // Match each resolved directory to our resolved workspaces, accumulating every match to a new (reduced) WorkspaceMap
  const changedWorkspaces = packageDirs.reduce<WorkspaceMap>(
    (acc, packageDir) => {
      const foundEntry = workspaceEntries.find(([_, { location }]) =>
        pathEquality(location, packageDir),
      );
      if (foundEntry) {
        const [foundWorkspaceName, foundWorkspace] = foundEntry;
        acc[foundWorkspaceName] = foundWorkspace;
      }
      return acc;
    },
    {},
  );

  return changedWorkspaces;
}

// Path equality !== striung equality
function pathEquality(path1: string | null, path2: string | null) {
  if (!path1 || !path2) return false;
  path1 = path.resolve(path1);
  path2 = path.resolve(path2);
  // Win32 is case insensitive
  return process.platform === 'win32'
    ? path1.toLowerCase() === path2.toLowerCase()
    : path1 === path2;
}
