import * as path from 'path';
import * as fs from 'fs-extra';
import { Project } from 'ts-morph';
import * as lockfile from '@yarnpkg/lockfile';
import * as yaml from 'js-yaml';

import type { CoreProperties, Dependency } from '@schemastore/package';
import getModularRoot from './getModularRoot';
import getLocation from './getLocation';
import getWorkspaceInfo, { WorkspaceInfo } from './getWorkspaceInfo';
import * as logger from './logger';

type DependencyManifest = NonNullable<CoreProperties['dependencies']>;
interface DependencyResolution {
  manifest: DependencyManifest;
  resolutions: DependencyManifest;
}
interface DependencyResolutionWithErrors extends DependencyResolution {
  manifestMiss: string[];
  lockFileMiss: string[];
}
type LockFileEntries = Record<string, { version: string }>;

// TODO: maybe refactor this to contain all the Modular conf fields and be used throught the whole project
interface ModularInputManifest extends CoreProperties {
  modular: {
    CDNResolutions?: DependencyManifest;
  };
}

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

export async function getPackageDependencies(target: string): Promise<{
  manifest: DependencyManifest;
  resolutions: DependencyManifest;
  selectiveCDNResolutions: DependencyManifest;
}> {
  // This function is based on the assumption that nested package are not supported, so dependencies can be either declared in the
  // target's package.json or hoisted up to the workspace root.
  const targetLocation = await getLocation(target);
  const workspaceInfo = await getWorkspaceInfo();

  const rootManifest = fs.readJSONSync(
    path.join(getModularRoot(), 'package.json'),
  ) as ModularInputManifest;

  const targetManifest = fs.readJSONSync(
    path.join(targetLocation, 'package.json'),
  ) as ModularInputManifest;

  const lockFileContents = fs.readFileSync(
    path.join(getModularRoot(), 'yarn.lock'),
    {
      encoding: 'utf8',
      flag: 'r',
    },
  );

  // Selective CDN resolutions is a list of dependencies that we want our CDN to use to build our dependencies with.
  // Some CDNs support this mechanism - https://github.com/esm-dev/esm.sh#specify-external-dependencies
  // This is especially useful if we have stateful dependencies (like React) that we need to query the same version through all our CDN depenencies
  // We just output them as a comma-separated parameter in the CDN template as [selectiveCDNResolutions]
  // TODO: possibly fallback to a filtered version of resolutions if this is not present
  const selectiveCDNResolutions = targetManifest?.modular?.CDNResolutions ?? {};

  // Package dependencies can be either local to the package or in the root package (hoisted)
  const packageDeps = Object.assign(
    Object.create(null),
    rootManifest.devDependencies,
    rootManifest.dependencies,
    targetManifest.devDependencies,
    targetManifest.dependencies,
  ) as Dependency;

  const lockDeps = parseYarnLock(lockFileContents, packageDeps);
  const dependenciesfromSource = getDependenciesFromSource(targetLocation);
  const resolvedPackageDependencies = resolvePackageDependencies({
    dependenciesfromSource,
    packageDeps,
    lockDeps,
    workspaceInfo,
  });

  // Log the errors
  resolvedPackageDependencies.manifestMiss.forEach((depName) =>
    logger.error(
      `Package ${depName} imported in ${target} source but not found in package dependencies or hoisted dependencies - this will prevent you from successfully building, starting or moving esm-views and will cause an error in the next release of modular`,
    ),
  );
  resolvedPackageDependencies.lockFileMiss.forEach((depName) =>
    logger.error(
      `Package ${depName} imported in ${target} source but not found in lockfile - this will prevent you from successfully building, starting or moving esm-views and will cause an error in the next release of modular. Have you installed your dependencies?`,
    ),
  );

  // Return resolutions, omitting the errors
  return {
    manifest: resolvedPackageDependencies.manifest,
    resolutions: resolvedPackageDependencies.resolutions,
    selectiveCDNResolutions,
  };
}

export function parseYarnLock(lockFile: string, deps: Dependency): Dependency {
  return parseYarnLockV1(lockFile, deps) || parseYarnLockV3(lockFile, deps);
}

interface ResolveDependencyArguments {
  dependenciesfromSource: string[];
  packageDeps: Dependency;
  lockDeps: Dependency;
  workspaceInfo: WorkspaceInfo;
}

export function resolvePackageDependencies({
  dependenciesfromSource,
  packageDeps,
  lockDeps,
  workspaceInfo,
}: ResolveDependencyArguments): DependencyResolutionWithErrors {
  /* Get dependencies from package.json or pinned version in lockfile (resolution)
   * Exclude workspace dependencies. Warn if a dependency is imported in the source code
   * but not specified in any of the package.jsons
   */
  const accumulator: DependencyResolutionWithErrors = {
    manifest: {},
    resolutions: {},
    manifestMiss: [],
    lockFileMiss: [],
  };
  return dependenciesfromSource.reduce((acc, depName) => {
    const depManifestVersion = packageDeps[depName];
    if (depManifestVersion) {
      acc.manifest[depName] = depManifestVersion;
    } else {
      acc.manifestMiss.push(depName);
    }
    // Resolve either from lockfile or from workspace info. Precedence is given to lockfile.
    const resolutionVersion =
      lockDeps[depName] ?? workspaceInfo[depName]?.version;
    if (resolutionVersion) {
      acc.resolutions[depName] = resolutionVersion;
    } else {
      acc.lockFileMiss.push(depName);
    }
    return acc;
  }, accumulator);
}

function parseYarnLockV1(
  lockFileContents: string,
  deps: Dependency,
): Dependency | null {
  let parsedLockfile: ReturnType<typeof lockfile.parse>;
  try {
    parsedLockfile = lockfile.parse(lockFileContents);
  } catch (e) {
    return null;
  }
  const lockFileEntries = parsedLockfile.object as LockFileEntries;
  return Object.entries(deps).reduce<Record<string, string>>(
    (acc, [name, version]) => {
      acc[name] = lockFileEntries[`${name}@${version}`]?.version;
      return acc;
    },
    {},
  );
}

function parseYarnLockV3(
  lockFileContents: string,
  deps: Dependency,
): Dependency {
  const dependencyArray = Object.entries(deps);
  const npmDependencyList = new Map(
    dependencyArray.map(([name, version]) => [`${name}@npm:${version}`, name]),
  );
  const lockFileEntries = yaml.load(lockFileContents) as LockFileEntries;
  // This function loops over all the dependency ranges listed in the lockfile and tries to match the given dependencies with an exact version.
  return Object.entries(lockFileEntries).reduce<Dependency>(
    (acc, [name, { version }]) => {
      // Yarn v3 lockfile comes with keys like "'yargs@npm:^15.0.2, yargs@npm:^15.1.0, yargs@npm:^15.3.1, yargs@npm:^15.4.1'" - split them
      const entryDependencies = name.split(', ');
      entryDependencies.some((dep) => {
        const npmName = npmDependencyList.get(dep);
        return !!(npmName && (acc[npmName] = version));
      });
      return acc;
    },
    {},
  );
}
