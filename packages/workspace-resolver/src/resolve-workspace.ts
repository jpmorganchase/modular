import { join } from 'path';
import { readJson } from 'fs-extra';
import globby from 'globby';

import type { ModularWorkspacePackage, ModularType } from 'modular-types';

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
      return globby.sync(`${path}/package.json`, { absolute: true, cwd });
    });
  }

  return resolveWorkspacesDefinition(cwd, def.packages);
}

type PackageJson = {
  name: string;
  version: string;
  workspaces?: string[] | { noHost: boolean; packages: string[] };
  modular?: { type: ModularType };
};

function readPackageJson(path: string): Promise<PackageJson> {
  return readJson(path) as Promise<PackageJson>;
}

type WorkspaceResolverOptions = {
  filter?: (json: PackageJson) => true | unknown;
};

export async function resolveWorkspace(
  isRoot: boolean,
  root: string,
  { filter }: WorkspaceResolverOptions,
  parent: ModularWorkspacePackage | null = null,
  collector = new Map<string, ModularWorkspacePackage>(),
): Promise<
  [Map<string, ModularWorkspacePackage>, ModularWorkspacePackage | null]
> {
  const path = packageJsonPath(root);
  const json = await readPackageJson(path);

  if (filter && filter(json) !== true) {
    return [collector, null];
  }

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
  };
  collector.set(json.name, pkg);

  if (json.modular?.type === 'root' && !isRoot) {
    throw new Error(
      'Nested modular roots are currently not supported by Modular',
    );
  }

  // Allow for the `workspaces` value to be `[]` or `{}`, otherwise throw (nested workspaces unsupported)
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
      false,
      link,
      { filter },
      pkg,
      collector,
    );
    child && pkg.children.push(child);
  }

  return [collector, pkg];
}
