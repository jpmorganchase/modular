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
    } else {
      console.log(
        'Dependencies for',
        workspaceName,
        'already calculated, skipping...',
      );
    }
  });

  return cache;

  function cacheDependencies(
    packageName: string,
    done: Set<string> = new Set(),
  ): Set<string> {
    console.log('doing', packageName);
    done.add(packageName);

    console.log('Getting dependencies for package', packageName);
    const immediateDependencies =
      workspaces[packageName].workspaceDependencies || [];

    let recursiveDeps: string[] = [];
    for (const dependency of immediateDependencies) {
      const flattenedFromCache = cache.get(dependency);
      console.log(
        'Getting dependencies from cache for dep',
        packageName,
        flattenedFromCache,
      );
      if (flattenedFromCache) {
        recursiveDeps = [...flattenedFromCache];
        continue;
      } else if (!done.has(dependency)) {
        console.log('scheduling undiscovered', dependency);
        recursiveDeps = [
          ...recursiveDeps,
          ...cacheDependencies(dependency, done),
        ];
      }
    }

    const result = new Set([...immediateDependencies, ...recursiveDeps]);
    console.log('Caching result for', packageName, '->', {
      immediateDependencies,
      recursiveDeps,
    });
    cache.set(packageName, result);
    return result;
  }
}
