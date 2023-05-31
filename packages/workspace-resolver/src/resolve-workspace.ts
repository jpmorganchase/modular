import path, { join } from 'path';
import { existsSync, readJson } from 'fs-extra';
import { globbySync } from '@esm2cjs/globby';
import semver from 'semver';
import type {
  ModularPackageJson,
  ModularWorkspacePackage,
  WorkspaceMap,
  WorkspaceObj,
} from '@modular-scripts/modular-types';

// See https://yarnpkg.com/features/workspaces#workspace-ranges-workspace
const YARN_WORKSPACE_RANGE_PREFIX = 'workspace:';

function packageJsonPath(dir: string) {
  return dir.endsWith('package.json') ? dir : join(dir, 'package.json');
}

function resolveWorkspacesDefinition(
  root: string,
  def: ModularPackageJson['workspaces'],
  ignoreFiles: string[],
): string[] {
  if (!def) {
    return [];
  }
  if (Array.isArray(def)) {
    return def.flatMap((path: string) => {
      return globbySync(
        [`${path}/package.json`, '!**/node_modules/**/*', '!**/__tests__/**/*'],
        {
          absolute: false,
          cwd: root,
          ignoreFiles: ignoreFiles,
        },
      );
    });
  }

  return resolveWorkspacesDefinition(root, def.packages, ignoreFiles);
}

function readPackageJson(
  isRoot: boolean,
  workingDir: string,
  relativePath: string,
): Promise<ModularPackageJson> {
  const jsonPath = isRoot
    ? relativePath
    : `${workingDir}${path.sep}${relativePath}`;

  return readJson(jsonPath) as Promise<ModularPackageJson>;
}

export async function resolveWorkspace(
  root: string,
  workingDir: string | null = null,
  parent: ModularWorkspacePackage | null = null,
  collector = new Map<string, ModularWorkspacePackage>(),
): Promise<
  [Map<string, ModularWorkspacePackage>, ModularWorkspacePackage | null]
> {
  const workingDirToUse = workingDir ?? process.cwd();
  const isRoot = workingDirToUse === root;
  const pkgPath = packageJsonPath(root);

  const json = await readPackageJson(isRoot, workingDirToUse, pkgPath);
  const type = json.modular?.type;
  const isModularRoot = type === 'root';

  if (!json.name) {
    throw new Error(
      `The package at ${pkgPath} does not have a valid name. Modular requires workspace packages to have a name.`,
    );
  }

  const versionToUse = isModularRoot ? '1.0.0' : json.version;

  if (!versionToUse) {
    throw new Error(
      `The package "${json.name}" has an invalid version. Modular requires workspace packages to have a version.`,
    );
  }

  const pkg: ModularWorkspacePackage = {
    path: pkgPath,
    location: path.dirname(pkgPath),
    name: json.name,
    version: versionToUse,
    workspace: !!json.workspaces,
    children: [],
    parent,
    modular: json.modular,
    type,
    // Like yarn classic `workspaces info`, we include all except peerDependencies
    dependencies: {
      ...json.optionalDependencies,
      ...json.devDependencies,
      ...json.dependencies,
    },
    // Various parts of modular reach into package.json
    // It's helpful to keep a full copy of this to avoid duplicate IO later on
    rawPackageJson: json,
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

  // Filter out workspaces covered by .modularignore or .gitignore
  const ignoreFiles: string[] = [];

  const modularIgnorePath = path.join(root, '.modularignore');
  const gitIgnore = path.join(root, '.gitignore');

  if (existsSync(modularIgnorePath)) {
    ignoreFiles.push('.modularignore');
  } else if (existsSync(gitIgnore)) {
    ignoreFiles.push('.gitignore');
  }

  for (const link of resolveWorkspacesDefinition(
    root,
    json.workspaces,
    ignoreFiles,
  )) {
    const [, child] = await resolveWorkspace(
      link,
      workingDirToUse,
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

  // Calculate deps and mismatches a-la Yarn classic `workspaces info`
  Array.from(workspacePackages.entries()).forEach(([pkgName, pkg]) => {
    // Exclude the root when analyzing package inter-dependencies
    if (pkg.type !== 'root') {
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

          // Account for use of Yarn Workspace Ranges
          // Note: we do not support the unstable project-relative path flavour syntax
          const rangeToUse = range.includes(YARN_WORKSPACE_RANGE_PREFIX)
            ? range.replace(YARN_WORKSPACE_RANGE_PREFIX, '')
            : range;

          return !semver.satisfies(match.version, rangeToUse);
        })
        .flatMap(([dep]) => dep);

      mappedDeps.set(pkgName, {
        location: path.dirname(pkg.path),
        workspaceDependencies: packageDepNames.filter(
          (depName) => !mismatchedWorkspaceDependencies.includes(depName),
        ),
        mismatchedWorkspaceDependencies,
      });
    }
  });

  return Object.fromEntries(mappedDeps);
}
