import * as path from 'path';
import * as fs from 'fs-extra';
import { Project } from 'ts-morph';
import { buildDepTree, LockfileType } from 'snyk-nodejs-lockfile-parser';
import type { CoreProperties, Dependency } from '@schemastore/package';
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
): Promise<{ manifest: DependencyManifest; resolutions: DependencyManifest }> {
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

  const lockFile = fs.readFileSync(path.join(getModularRoot(), 'yarn.lock'), {
    encoding: 'utf8',
    flag: 'r',
  });

  const deps = Object.assign(
    Object.create(null),
    rootManifest.devDependencies,
    rootManifest.dependencies,
    targetManifest.devDependencies,
    targetManifest.dependencies,
  ) as Dependency;

  const lockDeps = await buildDepTree(
    // Build a dependency tree from the lockfile, using target dependencies and root dependencies in order of specificity
    JSON.stringify(
      Object.assign(Object.create(null), targetManifest, {
        dependencies: Object.assign(
          Object.create(null),
          rootManifest.dependencies,
          targetManifest.dependencies,
        ) as Dependency,
        devDependencies: Object.assign(
          Object.create(null),
          rootManifest.devDependencies,
          targetManifest.devDependencies,
        ) as Dependency,
      }),
    ),
    lockFile,
    true,
    LockfileType.yarn,
  );

  /* Get dependencies from package.json (regular), root package.json (hoisted) or pinned version in lockfile (resolution)
   * Exclude workspace dependencies. Warn if a dependency is imported in the source code
   * but not specified in any of the package.jsons
   */
  const { manifest, resolutions } = getDependenciesFromSource(targetLocation)
    .filter((depName) => !(depName in workspaceInfo))
    .reduce<{ manifest: DependencyManifest; resolutions: DependencyManifest }>(
      (acc, depName) => {
        const depManifestVersion = deps[depName];
        if (!depManifestVersion) {
          logger.error(
            `Package ${depName} imported in ${target} source but not found in package dependencies or hoisted dependencies - this will prevent you from successfully build, start or move esm-views and will cause an error in the next release of modular`,
          );
        }
        const resolutionVersion = lockDeps.dependencies[depName].version;
        if (!resolutionVersion) {
          logger.error(
            `Package ${depName} imported in ${target} source but not found in lockfile - this will prevent you from successfully build, start or move esm-views and will cause an error in the next release of modular. Have you installed your dependencies?`,
          );
        }
        acc.manifest[depName] = depManifestVersion;
        if (resolutionVersion) {
          acc.resolutions[depName] = resolutionVersion;
        }
        return acc;
      },
      { manifest: {}, resolutions: {} },
    );

  console.log({ manifest, resolutions });

  return { manifest, resolutions };
}
