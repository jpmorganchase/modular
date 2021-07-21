import { getWorkspaceInfo } from './getWorkspaceInfo';

async function getPackageName(packageLocation: string): Promise<string> {
  const worktree = await getWorkspaceInfo();
  const matches = Object.entries(worktree).filter(([_packageName, info]) => {
    return info.location === packageLocation;
  });
  if (matches.length === 1) {
    return matches[0][0];
  } else {
    throw new Error(`Could not find package name at ${packageLocation}`);
  }
}

export default getPackageName;
