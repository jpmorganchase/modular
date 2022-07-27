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

  let newDeps = new Set<string>();
  for (const dependency of immediateDependencies) {
    if (!done.has(dependency)) {
      console.log('scheduling undiscovered', dependency);
      newDeps = new Set([
        ...newDeps,
        ...generateFlatWorkspaceDependencyForPackage(
          workspaces,
          dependency,
          done,
        ),
      ]);
    } else {
      console.log('Not scheduling', dependency, 'because already done');
    }
  }
  return new Set([...done, ...newDeps]);
}
