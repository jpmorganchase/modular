import * as path from 'path';
import getModularRoot from './getModularRoot';
import getRelativeWorkspaceLocation from './getRelativeLocation';

/**
 * Get absolute workspace path for a given workspace/package name
 * @param name Name of the workspace
 * @returns
 */
export async function getWorkspaceLocation(name: string): Promise<string> {
  return path.join(getModularRoot(), await getRelativeWorkspaceLocation(name));
}

export default getWorkspaceLocation;
