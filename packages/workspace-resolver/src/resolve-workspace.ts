import path, { join } from 'path';
import { readJson } from 'fs-extra';
import globby from 'globby';
import semver from 'semver';

import type {
  ModularWorkspacePackage,
  ModularType,
  WorkspaceMap,
  WorkspaceObj,
} from 'modular-types';

function packageJsonPath(dir: string) {
  return dir.endsWith('package.json') ? dir : join(dir, 'package.json');
}

function resolveWorkspacesDefinition(
  cwd: string,
  def: PackageJson['workspaces'],
): string[] {
  if (!def) {
    return [];
  }

  if (Array.isArray(def)) {
    return def.flatMap((path: string) => {
      return globby.sync(
        [`${path}/package.json`, '!**/node_modules/**/*', '!**/__tests__/**/*'],
        {
          absolute: false,
          cwd,
        },
      );
    });
  }

  return resolveWorkspacesDefinition(cwd, def.packages);
}

type PackageJson = {
  name: string;
  version: string;
  workspaces?: string[] | { noHost: boolean; packages: string[] };
  modular?: { type: ModularType };
  optionalDependencies: Record<string, string> | undefined;
  devDependencies: Record<string, string> | undefined;
  dependencies: Record<string, string> | undefined;
};

function readPackageJson(
  isRoot: boolean,
  workingDir: string,
  relativePath: string,
): Promise<PackageJson> {
  if (isRoot) {
    return readJson(relativePath) as Promise<PackageJson>;
  }

  return readJson(
    `${workingDir}${path.sep}${relativePath}`,
  ) as Promise<PackageJson>;
}

export async function resolveWorkspace(
  workingDir: string,
  isRoot: boolean,
  root: string,
  parent: ModularWorkspacePackage | null = null,
  collector = new Map<string, ModularWorkspacePackage>(),
): Promise<
  [Map<string, ModularWorkspacePackage>, ModularWorkspacePackage | null]
> {
  const path = packageJsonPath(root);
  const json = await readPackageJson(isRoot, workingDir, path);

  const pkg: ModularWorkspacePackage = {
    path,
    name: json.name,
    version: json.version,
    workspace: !!json.workspaces,
    children: [],
    parent,
    modular: {
      type: 'unknown',
      ...json.modular,
    },
    // Like yarn classic `workspaces info`, we include all except peerDependencies
    dependencies: {
      ...json.optionalDependencies,
      ...json.devDependencies,
      ...json.dependencies,
    },
  };
  collector.set(json.name, pkg);

  if (json.modular?.type === 'root' && !isRoot) {
    throw new Error(
      'Nested modular roots are currently not supported by Modular',
    );
  }

  // Allow for the `workspaces` value to be `[]` or `{}`, otherwise throw (as nested workspaces currently unsupported)
  if (!isRoot && json.workspaces) {
    if (Array.isArray(json.workspaces) && json.workspaces.length > 0) {
      throw new Error(
        'Nested workspaces are currently not supported by Modular',
      );
    }

    if (
      typeof json.workspaces === 'object' &&
      !Array.isArray(json.workspaces) &&
      Object.keys(json.workspaces).length > 0
    ) {
      throw new Error(
        'Nested workspaces are currently not supported by Modular',
      );
    }
  }

  for (const link of resolveWorkspacesDefinition(root, json.workspaces)) {
    const [, child] = await resolveWorkspace(
      workingDir,
      false,
      link,
      pkg,
      collector,
    );
    child && pkg.children.push(child);
  }

  return [collector, pkg];
}

export function analyzeWorkspaceDependencies(
  workspacePackages: Map<string, ModularWorkspacePackage>,
): WorkspaceMap {
  const mappedDeps = new Map<string, WorkspaceObj>();
  const exhaustivePackageNameList = Array.from(workspacePackages.keys());
  const allPackages = Array.from(workspacePackages.entries());

  // Exclude the root when analyzing package inter-dependencies
  const packagesWithoutRoot = Array.from(workspacePackages.entries()).filter(
    ([, pkg]) => {
      return pkg.modular.type !== 'root';
    },
  );

  // Calculate deps and mismatches a-la Yarn classic `workspaces info`
  packagesWithoutRoot.forEach(([pkgName, pkg]) => {
    const packageDepNames = Object.keys(pkg.dependencies || {}).filter(
      (dep) => {
        return exhaustivePackageNameList.includes(dep);
      },
    );
    const packageDeps = allPackages.filter(([, pkg]) =>
      packageDepNames.includes(pkg.name),
    );

    // Mismatched = version in packages/<package>/package.json does not satisfy the dependent's range
    const mismatchedWorkspaceDependencies = Object.entries(
      pkg.dependencies || {},
    )
      .filter(([dep, range]) => {
        const matchingPackage = packageDeps.find(
          ([matchingPackageName]) => dep === matchingPackageName,
        );
        if (!matchingPackage) {
          return false;
        }

        const [, match] = matchingPackage;
        return !semver.satisfies(match.version, range);
      })
      .flatMap(([dep]) => dep);

    mappedDeps.set(pkgName, {
      location: path.dirname(pkg.path),
      workspaceDependencies: packageDepNames.filter(
        (depName) => !mismatchedWorkspaceDependencies.includes(depName),
      ),
      mismatchedWorkspaceDependencies,
    });
  });

  return Object.fromEntries(mappedDeps);
}
