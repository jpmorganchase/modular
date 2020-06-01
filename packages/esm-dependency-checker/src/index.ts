import { promises as fs } from 'fs';
import * as path from 'path';

import * as babelParser from '@babel/parser';
import traverse from '@babel/traverse';

import { parse as parseLockfile } from '@yarnpkg/lockfile';
import globby from 'globby';
import chalk from 'chalk';
import execa from 'execa';
import { dirSync } from 'tmp';

import { normalizePattern } from './normalizePattern';
import { multiKeyStore } from './multiKeyStore';

type Name = string;
type Range = string;
type Version = string;

export type Dependencies = {
  [key: string]: Range;
};

type LockManifest = {
  version: Version;
  dependencies?: Dependencies;
};

type ExpandedDependencies = {
  [key: string]: ExpandedLockManifest;
};

type ExpandedLockManifest = {
  version: Version;
  dependencies?: ExpandedDependencies;
};

type LockfileObject = {
  [key: string]: LockManifest;
};

export type PackageJson = {
  name: Name;
  version: Version;
  dependencies?: Dependencies;
  peerDependencies?: Dependencies;
  main?: string;
  module?: string;
  'jsnext:main'?: string;
  type?: string;
};

type EnhancedPackageJson = PackageJson & {
  packagePath: string;
};

async function install(
  dependencies: Dependencies,
  cwd: string,
  tmpDir: string,
) {
  // The installation logic is based on https://github.com/ds300/patch-package/blob/2696a0f/src/makePatch.ts#L105-L135

  // Copy .npmrc/.yarnrc in case packages are hosted in private registry
  for (const rcFile of ['.npmrc', '.yarnrc']) {
    const rcPath = path.join(cwd, rcFile);
    try {
      await fs.copyFile(rcPath, path.join(tmpDir, rcFile));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const packageJsonPath = path.join(tmpDir, 'package.json');
  await fs.writeFile(
    packageJsonPath,
    JSON.stringify(
      {
        dependencies,
      },
      null,
      2,
    ),
  );

  console.info(chalk.grey('•'), `Installing dependencies with Yarn:`);
  console.info(dependencies);
  try {
    // Try first without ignoring scripts in case they are required
    // this works in 99.99% of cases
    await execa('yarnpkg', ['install', '--ignore-engines'], { cwd: tmpDir });
  } catch (e) {
    // Try again while ignoring scripts in case the script depends on
    // an implicit context which we haven't reproduced
    await execa(
      'yarnpkg',
      ['install', '--ignore-engines', '--ignore-scripts'],
      { cwd: tmpDir },
    );
  }
}

async function getLockfile(
  dependencies: Dependencies,
  cwd: string,
  tmpDir: string,
) {
  await install(dependencies, cwd, tmpDir);
  const yarnLockPath = path.join(tmpDir, 'yarn.lock');
  const rawLockfile = await fs.readFile(yarnLockPath, 'utf8');
  const lockfile = parseLockfile(rawLockfile, yarnLockPath)
    .object as LockfileObject;
  return lockfile;
}

function getLockManifestByNameAndRange(lockfile: LockfileObject) {
  const lockManifestByNameAndRange = new Map<Name, Map<Range, LockManifest>>();
  Object.keys(lockfile).forEach((key) => {
    const { name, range } = normalizePattern(key);

    let lockManifest = multiKeyStore.get(
      lockManifestByNameAndRange,
      name,
      range,
    );
    if (!lockManifest) {
      lockManifest = lockfile[key];
      multiKeyStore.set(lockManifestByNameAndRange, name, range, lockManifest);
    }
  });
  return lockManifestByNameAndRange;
}

async function getPackageJsonByNameAndVersion(tmpDir: string) {
  const dependencyPackageJsons = await globby(
    ['**/node_modules/@*/*/package.json', '**/node_modules/*/package.json'],
    { absolute: true, cwd: tmpDir },
  );

  return (
    await Promise.all(
      dependencyPackageJsons.map(async (packageJsonPath) => {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf8'),
        ) as PackageJson;

        return [packageJson, packageJsonPath] as const;
      }),
    )
  ).reduce((acc, [packageJson, packageJsonPath]) => {
    multiKeyStore.set(acc, packageJson.name, packageJson.version, {
      ...packageJson,
      packagePath: path.dirname(packageJsonPath),
    });
    return acc;
  }, new Map<Name, Map<Version, EnhancedPackageJson>>());
}

function getResolvedPackages(
  dependencies: Dependencies,
  lockManifestByNameAndRange: Map<Name, Map<Range, LockManifest>>,
  packageJsonByNameAndVersion: Map<Name, Map<Version, EnhancedPackageJson>>,
) {
  return Object.entries(dependencies).map(([name, range]) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const lockManifest = multiKeyStore.get(
      lockManifestByNameAndRange,
      name,
      range,
    )!;
    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ...multiKeyStore.get(
        packageJsonByNameAndVersion,
        name,
        lockManifest.version,
      )!,
      // Use `dependencies` from `yarn.lock`.
      dependencies: lockManifest.dependencies,
    };
  });
}

function makeIdentifier(packageJson: PackageJson) {
  return `${packageJson.name}@${packageJson.version}`;
}

type IsESM =
  | {
      isESM: true;
    }
  | {
      isESM: false;
      reason?: string;
    };

export type Result = Pick<EnhancedPackageJson, 'name' | 'version'> & IsESM;

function hasESMImportOrExport(code: string) {
  const ast = babelParser.parse(code, {
    // Babel assumes ES Modules, which isn't safe until CommonJS
    // dies. This changes the behavior to assume CommonJS unless
    // an `import` or `export` is present in the file.
    // https://github.com/webpack/webpack/issues/4039#issuecomment-419284940
    // https://github.com/facebook/create-react-app/blob/f5c3bdb/packages/babel-preset-react-app/dependencies.js#L64-L68
    sourceType: 'unambiguous',
  });

  let hasImportOrExport = false;
  traverse(ast, {
    Program(path) {
      // Inlined the implementation of `isModule` from https://github.com/babel/babel/blob/ddd40bf/packages/babel-helper-module-imports/src/is-module.js
      // Also see https://github.com/babel/babel/blob/9ada30c/packages/babel-helper-module-imports/src/import-injector.js#L214
      const { sourceType } = path.node;
      if (sourceType !== 'module' && sourceType !== 'script') {
        throw path.buildCodeFrameError(
          `Unknown sourceType "${sourceType as string}", cannot transform.`,
        );
      }
      hasImportOrExport = path.node.sourceType === 'module';
    },
  });
  return hasImportOrExport;
}

async function isESM(packageJson: EnhancedPackageJson): Promise<IsESM> {
  let isESModule = false;
  let reason: string | undefined = undefined;

  // Copied from https://github.com/mjackson/unpkg/blob/6bab432/modules/middleware/validateFilename.js#L4-L28
  // See https://github.com/rollup/rollup/wiki/pkg.module
  let filename = packageJson.module || packageJson['jsnext:main'];
  if (!filename) {
    // https://nodejs.org/api/esm.html#esm_code_package_json_code_code_type_code_field
    if (packageJson.type === 'module') {
      // Use whatever is in pkg.main or index.js
      filename = packageJson.main || 'index.js';
    } else if (packageJson.main && /\.mjs$/.test(packageJson.main)) {
      // Use .mjs file in pkg.main
      filename = packageJson.main;
    }
  }

  if (typeof filename === 'string') {
    try {
      const modulePath = path.resolve(packageJson.packagePath, filename);
      const moduleString = await fs.readFile(modulePath, 'utf8');

      isESModule = hasESMImportOrExport(moduleString);
      if (!isESModule) {
        reason =
          'package does not appear to have a valid ES module (e.g. missing `import` or `export`)';
      }
    } catch (error) {
      reason = (error as Error).message;
    }
  } else {
    reason = 'package does not contain an ES module';
  }

  return isESModule
    ? { isESM: true }
    : {
        isESM: false,
        reason,
      };
}

async function makeResult(packageJson: EnhancedPackageJson) {
  return {
    name: packageJson.name,
    version: packageJson.version,
    ...(await isESM(packageJson)),
  };
}

function isTypesPackage({ name }: PackageJson) {
  const parts = name.split('/');
  return parts.length > 1 && parts[0] === '@types';
}

async function getResults(
  dependencies: Dependencies,
  lockManifestByNameAndRange: Map<Name, Map<Range, LockManifest>>,
  packageJsonByNameAndVersion: Map<Name, Map<Version, EnhancedPackageJson>>,
) {
  const result: Result[] = [];
  const seen = new Set<string>();
  const queue = getResolvedPackages(
    dependencies,
    lockManifestByNameAndRange,
    packageJsonByNameAndVersion,
  );

  while (queue.length) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const resolvedPackage = queue.shift()!;
    if (isTypesPackage(resolvedPackage)) {
      continue;
    }

    const identifier = makeIdentifier(resolvedPackage);
    if (seen.has(identifier)) {
      continue;
    }
    seen.add(identifier);

    result.push(await makeResult(resolvedPackage));

    queue.push(
      ...getResolvedPackages(
        resolvedPackage.dependencies ?? {},
        lockManifestByNameAndRange,
        packageJsonByNameAndVersion,
      ),
    );
  }

  return result;
}

export async function checkESMDependencies(
  dependencies: Dependencies,
  { cwd = process.cwd() }: { cwd?: string } = {},
): Promise<Result[]> {
  const tmpRepo = dirSync({ unsafeCleanup: true });
  try {
    const lockfile = await getLockfile(dependencies, cwd, tmpRepo.name);
    const lockManifestByNameAndRange = getLockManifestByNameAndRange(lockfile);
    const packageJsonByNameAndVersion = await getPackageJsonByNameAndVersion(
      tmpRepo.name,
    );

    return await getResults(
      dependencies,
      lockManifestByNameAndRange,
      packageJsonByNameAndVersion,
    );
  } finally {
    tmpRepo.removeCallback();
  }
}
