import path from 'path';
import { getDiffedFiles } from './gitActions';
import { getAllWorkspaces } from './getAllWorkspaces';

export async function getChangedWorkspaces(): Promise<Set<string>> {
  const diffedFiles = getDiffedFiles();
  console.log(diffedFiles);
  const workspaces = await getAllWorkspaces();
  const workspaceEntries = Object.entries(workspaces);
  const changedWorkspaces: Set<string> = new Set();

  for (const changedFile of diffedFiles) {
    const changedWorkspace = workspaceEntries.find(([_, { location }]) =>
      isSameOrSubdir(location, changedFile),
    );
    if (!changedWorkspace) {
      // If the file changed is not in a workspace, all workspaces are marked as "changed"
      return new Set(Object.keys(workspaces));
    }
    changedWorkspaces.add(changedWorkspace[0]);
  }
  return changedWorkspaces;
}

function isSameOrSubdir(parent: string, dir: string): boolean {
  const relative = path.relative(parent, dir);
  return (
    !relative || (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}
