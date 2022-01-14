import * as path from 'path';
import * as fs from 'fs-extra';
import { Project } from 'ts-morph';
import type { CoreProperties } from '@schemastore/package';
import getModularRoot from '../utils/getModularRoot';
import getLocation from '../utils/getLocation';

type DependencyManifest = Record<string, string>;

const npmPackageMatcher =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*/;

// Get dependencies from import / require declarations, since they could be hoisted to the root workspace
function getDependenciesFromSource(workspaceLocation: string) {
  const project = new Project();
  project.addSourceFilesAtPaths(
    path.join(workspaceLocation, 'src/**/*{.d.ts,.ts,.js,.jsx,.tsx}'),
  );
  const dependencySet = new Set(
    project.getSourceFiles().flatMap((sourceFile) =>
      sourceFile
        .getImportDeclarations()
        .map(
          (declaration) =>
            declaration.getModuleSpecifierValue().match(npmPackageMatcher)?.[0],
        )
        .filter(Boolean),
    ),
  ) as Set<string>;

  return Array.from(dependencySet);
}

export async function generateDependencyManifest(target: string) {
  // This is based on the assumption that nested package are not supported, so dependencies can be either declared in the
  // target's package.json or hoisted up to the workspace root.
  const targetLocation = await getLocation(target);

  const rootPackageJsonDependencies =
    (
      fs.readJSONSync(
        path.join(getModularRoot(), 'package.json'),
      ) as CoreProperties
    ).dependencies || {};

  const targetPackageJsonDependencies =
    (
      fs.readJSONSync(
        path.join(targetLocation, 'package.json'),
      ) as CoreProperties
    ).dependencies || {};

  const manifest = getDependenciesFromSource(
    targetLocation,
  ).reduce<DependencyManifest>((manifest, depName) => {
    const depVersion =
      targetPackageJsonDependencies[depName] ??
      rootPackageJsonDependencies[depName];
    if (!depVersion) {
      throw new Error(
        `Package ${depName} imported in ${target} source but not found in package dependencies or hoisted dependencies`,
      );
    }
    manifest[depName] = depVersion;
    return manifest;
  }, {});

  return manifest;
}
