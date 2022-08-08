import memoize from './memoize';
import getModularRoot from './getModularRoot';

import {
  resolveWorkspace,
  analyzeWorkspaceDependencies,
} from '@modular-scripts/workspace-resolver';

import type {
  WorkspaceMap,
  ModularWorkspacePackage,
} from '@modular-scripts/modular-types';

type WorkspaceContent = [Map<string, ModularWorkspacePackage>, WorkspaceMap];
export interface PackageManagerInfo {
  getWorkspaceCommand: string;
  formatWorkspaceCommandOutput: (stdout: string) => WorkspaceMap;
}

export async function getWorkspacePackages(
  modularRoot: string,
): Promise<WorkspaceContent> {
  const [allPackages] = await resolveWorkspace(modularRoot);

  return [allPackages, analyzeWorkspaceDependencies(allPackages)];
}

function _getAllWorkspaces(): Promise<WorkspaceContent> {
  const modularRoot = getModularRoot();

  return getWorkspacePackages(modularRoot);
}

export const getAllWorkspaces = memoize(_getAllWorkspaces);
