import * as fs from 'fs-extra';
import * as path from 'path';

import { ModularType, ModularPackageJson } from './isModularType';
import { getAllWorkspaces } from './getAllWorkspaces';
import getModularRoot from './getModularRoot';
import memoize from './memoize';

export interface WorkSpaceRecord {
  location: string;
  workspaceDependencies: string[];
  mismatchedWorkspaceDependencies: string[];
  type: ModularType;
  public: boolean;
  version?: string;
}

type WorkspaceInfo = Record<string, WorkSpaceRecord>;

export async function getWorkspaceInfo(): Promise<WorkspaceInfo> {
  const workspaces = await getAllWorkspaces();
  const workspaceRoot = getModularRoot();

  const res: WorkspaceInfo = {};
  for (const [packageName, packageInfo] of Object.entries(workspaces)) {
    const packageJson = (await fs.readJSON(
      path.join(workspaceRoot, packageInfo.location, 'package.json'),
    )) as ModularPackageJson;

    const type = packageJson.modular?.type || ('package' as ModularType);

    const modularPackageInfo = {
      ...packageInfo,
      type,
      public: !packageJson.private,
      version: packageJson.version,
    };

    res[packageName] = modularPackageInfo;
  }

  return res;
}

export default memoize(getWorkspaceInfo);
