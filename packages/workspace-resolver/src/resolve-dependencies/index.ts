import { computeAncestorSet, setUnion } from './dependency-graph';
import type { WorkspaceContent } from '@modular-scripts/modular-types';
export * from './dependency-graph';

export function computeAncestorWorkspaces(
  selectedWorkspaces: WorkspaceContent,
  allWorkspaces: WorkspaceContent,
): WorkspaceContent {
  const selectedWorkspaceNames = Object.keys(selectedWorkspaces[1]);
  const ancestorWorkspacesSet = setUnion(
    computeAncestorSet(selectedWorkspaceNames, allWorkspaces[1]),
    selectedWorkspaceNames,
  );
  const ancestorsWorkspaces: WorkspaceContent = [new Map([]), {}];

  for (const dependencyName of [...ancestorWorkspacesSet]) {
    const [ancestorsPackageMap, ancestorsWorkspaceRecord] = ancestorsWorkspaces;
    const [allPackageMap, allWorkspaceRecord] = allWorkspaces;
    const currentPackage = allPackageMap.get(dependencyName);
    if (currentPackage) {
      ancestorsPackageMap.set(dependencyName, currentPackage);
    }
    const currentWorkspace = allWorkspaceRecord[dependencyName];
    ancestorsWorkspaceRecord[dependencyName] = currentWorkspace;
  }
  return ancestorsWorkspaces;
}
