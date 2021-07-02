import * as path from 'path';

import getModularRoot from './getModularRoot';
import { getWorkspaceInfo } from './getWorkspaceInfo';

export async function getLocation(name: string): Promise<string> {
  const modularRoot = getModularRoot();
  const workspaceInfo = await getWorkspaceInfo();
  const workspace = workspaceInfo[name];
  if (workspace) {
    return path.join(modularRoot, workspace.location);
  } else {
    throw new Error(`Could not find ${name} in current workspace.`);
  }
}

export default getLocation;
