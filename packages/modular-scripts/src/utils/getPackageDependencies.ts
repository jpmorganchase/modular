import * as path from 'path';
import * as fs from 'fs-extra';
import { Project } from 'ts-morph';
import * as lockfile from '@yarnpkg/lockfile';
import * as yaml from 'js-yaml';

import type { CoreProperties, Dependency } from '@schemastore/package';
import getModularRoot from './getModularRoot';
import getLocation from './getLocation';
import getWorkspaceInfo, { WorkspaceInfo } from './getWorkspaceInfo';
import { parsePackageName } from './parsePackageName';
import * as logger from './logger';
interface DependencyResolution {
  manifest: Dependency;
  resolutions: Dependency;
}
interface DependencyResolutionWithErrors extends DependencyResolution {
  manifestMiss: string[];
  lockFileMiss: string[];
}
type LockFileEntries = Record<string, { version: string }>;

/* Get dependencies from import / require declarations, since they could be hoisted to the root workspace. Exclude test files. */
function analyzeDependencies(workspaceLocation: string) {
  const project = new Project();
  project.addSourceFilesAtPaths(
    path.join(workspaceLocation, 'src/**/!(*.test){.d.ts,.ts,.js,.jsx,.tsx}'),
  );

  const dependencySet = new Set<string>();
  const rawImportSet: Set<string> = new Set();

  project.getSourceFiles().forEach((sourceFile) =>
    sourceFile.getImportDeclarations().forEach((declaration) => {
      const moduleSpecifier = declaration.getModuleSpecifierValue();
      const { dependencyName } = parsePackageName(moduleSpecifier);
      if (dependencyName) {
        dependencySet.add(dependencyName);
        rawImportSet.add(moduleSpecifier);
      }
    }),
  );

  return {
    dependencies: Array.from(dependencySet),
    rawImports: rawImportSet,
  };
}

export async function getPackageDependencies(target: string): Promise<{
  manifest: Dependency;
  resolutions: Dependency;
  selectiveCDNResolutions: Dependency;
  rawImports: Set<string>;
}> {
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
  const selectiveCDNResolutions = targetManifest?.resolutions ?? {};

  // Package dependencies can be either local to the package or in the root package (hoisted)
  const packageDeps = Object.assign(
    Object.create(null) as Record<string, unknown>,
    rootManifest.devDependencies,
    rootManifest.dependencies,
    targetManifest.devDependencies,
    targetManifest.dependencies,
  ) as Dependency;

  const lockDeps = parseYarnLock(lockFileContents, packageDeps);
  const dependenciesfromSource = analyzeDependencies(targetLocation);

  const resolvedPackageDependencies = resolvePackageDependencies({
    dependencies: dependenciesfromSource.dependencies,
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
    selectiveCDNResolutions,
    manifest: resolvedPackageDependencies.manifest,
    resolutions: resolvedPackageDependencies.resolutions,
    rawImports: dependenciesfromSource.rawImports,
  };
}

export function parseYarnLock(lockFile: string, deps: Dependency): Dependency {
  return parseYarnLockV1(lockFile, deps) || parseYarnLockV3(lockFile, deps);
}

interface ResolveDependencyArguments {
  dependencies: string[];
  packageDeps: Dependency;
  lockDeps: Dependency;
  workspaceInfo: WorkspaceInfo;
}

export function resolvePackageDependencies({
  dependencies,
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
  return dependencies.reduce((acc, depName) => {
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
