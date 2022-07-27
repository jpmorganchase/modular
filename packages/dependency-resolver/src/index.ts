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

export function flattenWorkspaceDependencies(
  workspaces: Record<string, LiteWorkSpaceRecord>,
): Map<string, Set<string>> {
  const cache: Map<string, Set<string>> = new Map();

  Object.keys(workspaces).forEach((workspaceName) => {
    if (!cache.has(workspaceName)) {
      cacheDependencies(workspaceName);
    }
  });

  return cache;

  function cacheDependencies(
    packageName: string,
    done: Set<string> = new Set(),
  ): Set<string> {
    done.add(packageName);
    const immediateDependencies =
      workspaces[packageName].workspaceDependencies || [];

    let recursiveDeps: string[] = [];
    for (const dependency of immediateDependencies) {
      const fromCache = cache.get(dependency);
      if (fromCache) {
        recursiveDeps = [...fromCache];
        continue;
      } else if (!done.has(dependency)) {
        recursiveDeps = [
          ...recursiveDeps,
          ...cacheDependencies(dependency, done),
        ];
      }
    }

    const result = new Set([...immediateDependencies, ...recursiveDeps]);
    cache.set(packageName, result);
    return result;
  }
}
