import getWorkspaceInfo from './getWorkspaceInfo';

export async function getRelativeLocation(name: string): Promise<string> {
  const workspaceInfo = await getWorkspaceInfo();
  const workspace = workspaceInfo[name];
  if (workspace) {
    return workspace.location;
  } else {
    throw new Error(`Could not find ${name} in current workspace.`);
  }
}

export default getRelativeLocation;
