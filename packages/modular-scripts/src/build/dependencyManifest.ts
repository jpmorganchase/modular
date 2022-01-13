import * as path from 'path';
import * as fs from 'fs-extra';
import { Project } from 'ts-morph';
import type { CoreProperties } from '@schemastore/package';
import getModularRoot from '../utils/getModularRoot';
import getLocation from '../utils/getLocation';

type DependencyManifest = Record<string, string>;

const npmPackageMatcher =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*/;

// We need to get dependencies from source, since the package.json dependencies could be hosted
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

  console.log(dependencySet);

  return Array.from(dependencySet);
}

export async function generateDependencyManifest(target: string) {
  // This is based on the assumption that packages can be either contained in the current package.json or hoisted to the root one.
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
    if (depVersion) {
      manifest[depName] = depVersion;
    }
    return manifest;
  }, {});

  return manifest;
}
