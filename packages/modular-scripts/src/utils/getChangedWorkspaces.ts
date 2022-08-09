import path from 'path';
import pkgUp from 'pkg-up';
import { getDiffedFiles } from './gitActions';
import { getAllWorkspaces } from './getAllWorkspaces';
import getModularRoot from './getModularRoot';
import { WorkspaceMap } from '@modular-scripts/modular-types';

// Gets a list of changed files, then maps them to their workspace and returns a subset of WorkspaceMap
export async function getChangedWorkspaces(
  targetBranch: string,
): Promise<WorkspaceMap> {
  const diffedFiles = getDiffedFiles(targetBranch);
  const workspaces = await getAllWorkspaces();
  const modularRoot = getModularRoot();

  // Resolve each of the changed files to their nearest package.json. The resulting list can contain duplicates and null holes
  const packageManifestPaths = await Promise.all(
    diffedFiles.map((changedFile) => pkgUp({ cwd: path.dirname(changedFile) })),
  );

  return matchWorkspaces(packageManifestPaths, modularRoot, workspaces);
}

// Match workspace manifest paths to a subset of WorkspaceMap. This function works completely in memory and is test-friendly
export function matchWorkspaces(
  packagePaths: (string | null)[],
  root: string,
  workspaces: WorkspaceMap,
): WorkspaceMap {
  const workspaceEntries = Object.entries(workspaces);
  const result: WorkspaceMap = {};

  for (const packagePath of packagePaths) {
    // Ignore holes
    if (!packagePath) continue;
    // Get the package directory from the package.json path and make it relative to the root, for comparison with the original WorkspaceMap
    const packageDir = path.relative(root, path.dirname(packagePath));
    // Match the package directory to its entry WorkspaceMap, using pathEquality
    const foundEntry = workspaceEntries.find(([_, { location }]) =>
      pathEquality(location, packageDir),
    );
    // If found, insert the entry into the WorkspaceMap that we are building
    if (foundEntry) {
      const [foundWorkspaceName, foundWorkspace] = foundEntry;
      result[foundWorkspaceName] = foundWorkspace;
    }
  }
  return result;
}

// Path equality !== string equality
function pathEquality(path1: string | null, path2: string | null) {
  if (path1 === null || path2 === null) return false;
  path1 = path.resolve(path1);
  path2 = path.resolve(path2);
  // Win32 is case insensitive
  return process.platform === 'win32'
    ? path1.toLowerCase() === path2.toLowerCase()
    : path1 === path2;
}
