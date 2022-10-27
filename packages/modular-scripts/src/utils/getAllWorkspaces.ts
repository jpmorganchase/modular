import memoize from './memoize';
import getModularRoot from './getModularRoot';

import {
  resolveWorkspace,
  analyzeWorkspaceDependencies,
} from '@modular-scripts/workspace-resolver';

import type {
  WorkspaceContent,
  WorkspaceMap,
} from '@modular-scripts/modular-types';
export interface PackageManagerInfo {
  getWorkspaceCommand: string;
  formatWorkspaceCommandOutput: (stdout: string) => WorkspaceMap;
}

export async function getWorkspacePackages(
  modularRoot: string,
  target: string = modularRoot,
): Promise<WorkspaceContent> {
  const [allPackages] = await resolveWorkspace(modularRoot, target);

  return [allPackages, analyzeWorkspaceDependencies(allPackages)];
}

function _getAllWorkspaces(target?: string): Promise<WorkspaceContent> {
  const modularRoot = getModularRoot();

  return getWorkspacePackages(modularRoot, target);
}

export const getAllWorkspaces = memoize(_getAllWorkspaces);
