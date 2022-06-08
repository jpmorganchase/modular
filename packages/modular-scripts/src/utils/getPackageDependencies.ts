import * as path from 'path';
import * as fs from 'fs-extra';
import { Project } from 'ts-morph';
import * as lockfile from '@yarnpkg/lockfile';
import * as yaml from 'js-yaml';

import type { CoreProperties, Dependency } from '@schemastore/package';
import getModularRoot from './getModularRoot';
import getLocation from './getLocation';
import getWorkspaceInfo from './getWorkspaceInfo';
import * as logger from './logger';

type DependencyManifest = NonNullable<CoreProperties['dependencies']>;
type LockFileEntries = Record<string, { version: string }>;

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
  // This function is based on the assumption that nested package are not supported, so dependencies can be either declared in the
  // target's package.json or hoisted up to the workspace root.
  const targetLocation = await getLocation(target);
  const workspaceInfo = await getWorkspaceInfo();

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

  const lockDeps = parseYarnLock(lockFile, deps);

  /* Get dependencies from package.json (regular), root package.json (hoisted) or pinned version in lockfile (resolution)
   * Exclude workspace dependencies. Warn if a dependency is imported in the source code
   * but not specified in any of the package.jsons
   */
  const { manifest, resolutions } = getDependenciesFromSource(
    targetLocation,
  ).reduce<{ manifest: DependencyManifest; resolutions: DependencyManifest }>(
    (acc, depName) => {
      const depManifestVersion = deps[depName];
      if (depManifestVersion) {
        acc.manifest[depName] = depManifestVersion;
      } else {
        logger.error(
          `Package ${depName} imported in ${target} source but not found in package dependencies or hoisted dependencies - this will prevent you from successfully build, start or move esm-views and will cause an error in the next release of modular`,
        );
      }
      // Resolve either from lockfile or from workspace info. Precedence is given to lockfile.
      const resolutionVersion =
        lockDeps[depName] ?? workspaceInfo[depName]?.version;
      if (resolutionVersion) {
        acc.resolutions[depName] = resolutionVersion;
      } else {
        logger.error(
          `Package ${depName} imported in ${target} source but not found in lockfile - this will prevent you from successfully build, start or move esm-views and will cause an error in the next release of modular. Have you installed your dependencies?`,
        );
      }
      return acc;
    },
    { manifest: {}, resolutions: {} },
  );
  return { manifest, resolutions };
}

function parseYarnLock(lockFile: string, deps: Dependency): Dependency {
  return parseYarnLockV1(lockFile, deps) || parseYarnLockV3(lockFile, deps);
}

function parseYarnLockV1(
  lockFile: string,
  deps: Dependency,
): Dependency | null {
  let parsedLockfile: ReturnType<typeof lockfile.parse>;
  try {
    parsedLockfile = lockfile.parse(lockFile);
  } catch (e) {
    return null;
  }
  return Object.entries(deps).reduce<Record<string, string>>(
    (acc, [name, version]) => {
      const resolution = (parsedLockfile.object as LockFileEntries)[
        `${name}@${version}`
      ]?.version;
      if (resolution !== undefined) {
        acc[name] = resolution;
      }
      return acc;
    },
    {},
  );
}

function parseYarnLockV3(lockFile: string, deps: Dependency): Dependency {
  const dependencyArray = Object.entries(deps);
  // This function loops over all the dependency ranges listed in the lockfile and tries to match the given dependencies with an exact version.
  return Object.entries(
    yaml.load(lockFile) as LockFileEntries,
  ).reduce<Dependency>((acc, [name, { version }]) => {
    // Yarn v3 lockfile comes with keys like "'yargs@npm:^15.0.2, yargs@npm:^15.1.0, yargs@npm:^15.3.1, yargs@npm:^15.4.1'" - split them
    const entryDependencies = name.split(', ');
    for (const [dependencyName, dependencyVersion] of dependencyArray) {
      if (
        entryDependencies.includes(`${dependencyName}@npm:${dependencyVersion}`)
      ) {
        acc[dependencyName] = version;
      }
    }
    return acc;
  }, {});
}
