import path from 'path';
import pkgUp from 'pkg-up';
import { getDiffedFiles } from './gitActions';
import getModularRoot from './getModularRoot';
import type { WorkspaceContent } from './getAllWorkspaces';

// Gets a list of changed files, then maps them to their workspace and returns a subset of WorkspaceContent
export async function getChangedWorkspaces(
  workspaceContent: WorkspaceContent,
  targetBranch: string,
): Promise<WorkspaceContent> {
  const diffedFiles = getDiffedFiles(targetBranch);
  const modularRoot = getModularRoot();

  // Resolve each of the changed files to their nearest package.json. The resulting list can contain duplicates and null holes
  const packageManifestPaths = await Promise.all(
    diffedFiles.map((changedFile) => pkgUp({ cwd: path.dirname(changedFile) })),
  );

  return matchWorkspaces(packageManifestPaths, modularRoot, workspaceContent);
}

// Match workspace manifest paths to a subset of WorkspaceContent. This function works completely in memory and is test-friendly
export function matchWorkspaces(
  packagePaths: (string | null)[],
  root: string,
  workspaceContent: WorkspaceContent,
): WorkspaceContent {
  const [packages, workspaces] = workspaceContent;
  const workspaceEntries = Object.entries(workspaces);
  const result: WorkspaceContent = [new Map([]), {}];

  for (const packagePath of packagePaths) {
    const [resultPackages, resultWorkspaces] = result;
    // Ignore holes
    if (!packagePath) continue;
    // Get the package directory from the package.json path and make it relative to the root, for comparison with the original WorkspaceContent
    const packageDir = path.relative(root, path.dirname(packagePath));
    // Match the package directory to its entry WorkspaceContent, using pathEquality
    const foundEntry = workspaceEntries.find(([_, { location }]) =>
      pathEquality(location, packageDir),
    );
    // If found, insert the entries into the WorkspaceContent that we are building
    if (foundEntry) {
      const [foundWorkspaceName, foundWorkspace] = foundEntry;
      resultWorkspaces[foundWorkspaceName] = foundWorkspace;
      const foundPackage = packages.get(foundWorkspaceName);
      if (foundPackage) {
        resultPackages.set(foundWorkspaceName, foundPackage);
      }
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
