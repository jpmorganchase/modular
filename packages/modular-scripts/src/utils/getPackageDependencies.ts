import * as path from 'path';
import * as fs from 'fs-extra';
import { Project } from 'ts-morph';
import type { CoreProperties } from '@schemastore/package';
import getModularRoot from './getModularRoot';
import getLocation from './getLocation';
import getWorkspaceInfo from './getWorkspaceInfo';
import * as logger from './logger';

type DependencyManifest = NonNullable<CoreProperties['dependencies']>;

const npmPackageMatcher =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*/;

/* Get dependencies from import / require declarations, since they could be hoisted to the root workspace. Exclude test files. */
function getDependenciesFromSource(workspaceLocation: string) {
  const project = new Project();
  project.addSourceFilesAtPaths(
    path.join(workspaceLocation, 'src/**/!(*.test){.d.ts,.ts,.js,.jsx,.tsx}'),
  );

  const dependencySet = new Set(
    project
      .getSourceFiles()
      .flatMap((sourceFile) =>
        sourceFile
          .getImportDeclarations()
          .map(
            (declaration) =>
              npmPackageMatcher.exec(
                declaration.getModuleSpecifierValue(),
              )?.[0],
          ),
      )
      .filter(Boolean),
  ) as Set<string>;

  return Array.from(dependencySet);
}

export async function getPackageDependencies(
  target: string,
): Promise<DependencyManifest> {
  /* This function is based on the assumption that nested package are not supported, so dependencies can be either declared in the
   * target's package.json or hoisted up to the workspace root.
   */
  const targetLocation = await getLocation(target);
  const workspaceInfo = getWorkspaceInfo();

  const rootManifest = fs.readJSONSync(
    path.join(getModularRoot(), 'package.json'),
  ) as CoreProperties;

  const targetManifest = fs.readJSONSync(
    path.join(targetLocation, 'package.json'),
  ) as CoreProperties;

  const deps = {
    ...rootManifest.dependencies,
    ...targetManifest.dependencies,
    ...rootManifest.devDependencies,
    ...targetManifest.devDependencies,
  };

  /* Get regular dependencies from package.json (regular) or root package.json (hoisted)
   * Exclude workspace dependencies. Error if a dependency is imported in the source code
   * but not specified in any of the package.jsons
   */
  const manifest = getDependenciesFromSource(targetLocation)
    .filter((depName) => !(depName in workspaceInfo))
    .reduce<DependencyManifest>((manifest, depName) => {
      const depVersion = deps[depName];
      if (!depVersion) {
        logger.error(
          `Package ${depName} imported in ${target} source but not found in package dependencies or hoisted dependencies - this will prevent you from successfully build, start or move packages in the next release of modular`,
        );
      }
      manifest[depName] = depVersion;
      return manifest;
    }, {});

  return manifest;
}
