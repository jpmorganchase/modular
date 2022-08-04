import { getAllWorkspaces } from './getAllWorkspaces';
import memoize from './memoize';

import type { ModularType } from '@modular-scripts/modular-types';

export interface WorkSpaceRecord {
  location: string;
  workspaceDependencies: string[];
  mismatchedWorkspaceDependencies: string[];
  type: ModularType;
  public: boolean;
  version?: string;
}

export type WorkspaceInfo = Record<string, WorkSpaceRecord>;

export async function getWorkspaceInfo(): Promise<WorkspaceInfo> {
  const [workspaces, workspacesMap] = await getAllWorkspaces();
  const workspaceInfo: WorkspaceInfo = {};

  return Object.entries(workspacesMap).reduce(
    (byPath, [packageName, packageInfo]) => {
      const workspace = workspaces.get(packageName);
      // @modular-scripts/workspace-resolver should guarantee a 1:1 relationship of items in workspaces and workspacesMap
      if (!workspace) {
        throw new Error(
          'Modular was not able to understand your workspaces configuration',
        );
      }
      const { rawPackageJson } = workspace;

      const type = rawPackageJson.modular?.type || ('package' as ModularType);
      workspaceInfo[packageName] = {
        ...packageInfo,
        type,
        public: !rawPackageJson.private,
        version: rawPackageJson.version,
      };

      return byPath;
    },
    workspaceInfo,
  );
}

export default memoize(getWorkspaceInfo);
