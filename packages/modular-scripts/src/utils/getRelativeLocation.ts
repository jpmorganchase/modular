import getWorkspaceInfo from './getWorkspaceInfo';

export async function getRelativeLocation(name: string): Promise<string> {
  const workspaceInfo = await getWorkspaceInfo();
  const workspace = workspaceInfo[name];
  if (workspace) {
    return workspace.location;
  } else {
    const available = Object.keys(workspaceInfo);
    throw new Error(
      `Could not find ${name} in current workspace. Available packages are \n\t${available.join(
        '\n\t',
      )}`,
    );
  }
}

export default getRelativeLocation;
