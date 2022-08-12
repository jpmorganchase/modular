import { computeAncestorSet, setUnion } from './dependency-graph';
import type { WorkspaceContent } from '@modular-scripts/modular-types';
export * from './dependency-graph';

export function computeAncestorWorkspaces(
  selectedWorkspaces: WorkspaceContent,
  allWorkspaces: WorkspaceContent,
): WorkspaceContent {
  const selectWorkspaceNames = Object.keys(selectedWorkspaces[1]);
  const ancestorWorkspacesSet = setUnion(
    computeAncestorSet(selectWorkspaceNames, allWorkspaces[1]),
    selectWorkspaceNames,
  );
  const ancestorsWorkspaces: WorkspaceContent = [new Map([]), {}];

  for (const dependencyName of [...ancestorWorkspacesSet]) {
    const [ancestorsPackageMap, ancestorsWorkspaceRecord] = ancestorsWorkspaces;
    const [allPackageMap, allWorkspaceRecord] = ancestorsWorkspaces;
    const currentPackage = allPackageMap.get(dependencyName);
    if (currentPackage) {
      ancestorsPackageMap.set(dependencyName, currentPackage);
    }
    const currentWorkspace = allWorkspaceRecord[dependencyName];
    ancestorsWorkspaceRecord[dependencyName] = currentWorkspace;
  }
  return ancestorsWorkspaces;
}
