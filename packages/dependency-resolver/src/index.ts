export interface LiteWorkSpaceRecord {
  location: string;
  workspaceDependencies?: string[];
  version?: string;
}

// interface WorkspaceDependencyRecord {
//   flatWorkspaceDependencies: Set<string>;
//   hasCycle: boolean;
// }

// type WorkspaceDependencies = Map<string, WorkspaceDependencyRecord>;

export function generateFlatWorkspaceDependencyForPackage(
  workspaces: Record<string, LiteWorkSpaceRecord>,
  packageName: string,
  done: Set<string> = new Set(),
): Set<string> {
  console.log('doing', packageName);
  done.add(packageName);

  console.log('Getting dependencies for package', packageName);
  const immediateDependencies =
    workspaces[packageName].workspaceDependencies || [];

  let newDeps: string[] = [];
  for (const dependency of immediateDependencies) {
    if (!done.has(dependency)) {
      console.log('scheduling undiscovered', dependency);
      newDeps = [
        ...newDeps,
        ...generateFlatWorkspaceDependencyForPackage(
          workspaces,
          dependency,
          done,
        ),
      ];
    } else {
      if (dependency === packageName) {
        console.warn('Loop found at dependency', dependency);
      }
      console.log('Not scheduling', dependency, 'because already done');
    }
  }
  return new Set([...done, ...newDeps]);
}
