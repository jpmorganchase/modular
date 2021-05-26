import * as fs from 'fs-extra';
import * as path from 'path';

import { PackageType, ModularPackageJson } from '../utils/isModularType';
import { getAllWorkspaces } from '../utils/getAllWorkspaces';
import getModularRoot from '../utils/getModularRoot';

export interface WorkSpaceRecord {
  location: string;
  workspaceDependencies: string[];
  mismatchedWorkspaceDependencies: string[];
  type: PackageType;
  public: boolean;
}

type WorkspaceInfo = Record<string, WorkSpaceRecord>;

export async function getWorkspaceInfo(): Promise<WorkspaceInfo> {
  const workspace = getAllWorkspaces();
  const workspaceRoot = getModularRoot();

  const res: WorkspaceInfo = {};
  for (const [packageName, packageInfo] of Object.entries(workspace)) {
    const packageJson = (await fs.readJSON(
      path.join(workspaceRoot, packageInfo.location, 'package.json'),
    )) as ModularPackageJson;

    const type: PackageType = (packageJson.modular?.type ||
      'package') as PackageType;

    const modularPackageInfo = Object.assign(packageInfo, {
      type,
      public:
        type === ('package' as PackageType) ? !!packageJson.public : false,
    });

    res[packageName] = modularPackageInfo;
  }

  return res;
}
