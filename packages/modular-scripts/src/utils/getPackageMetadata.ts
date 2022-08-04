import * as path from 'path';
import * as ts from 'typescript';
import * as fse from 'fs-extra';
import memoize from '../utils/memoize';

import getModularRoot from '../utils/getModularRoot';
import { getAllWorkspaces } from '../utils/getAllWorkspaces';
import { reportTSDiagnostics } from './reportTSDiagnostics';

import type { JSONSchemaForTheTypeScriptCompilerSConfigurationFile as TSConfig } from '@schemastore/tsconfig';
import type { ModularPackageJson } from '@modular-scripts/modular-types';

interface PackageByPath {
  [key: string]: ModularPackageJson;
}

const typescriptConfigFilename = 'tsconfig.json';

function distinct<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

async function getPackageMetadata() {
  const modularRoot = getModularRoot();

  // dependencies defined at the root
  const rootPackageJsonDependencies =
    (
      fse.readJSONSync(
        path.join(modularRoot, 'package.json'),
      ) as ModularPackageJson
    ).dependencies || {};

  // let's populate the above three
  const [workspaces, workspacesMap] = await getAllWorkspaces();

  // an array of all the package names
  const packageNames = Array.from(workspaces.keys());

  // a map of all package.json contents, indexed by package name
  const pkgByName: PackageByPath = {};
  const packageJsons = Array.from(workspaces).reduce(
    (byName, [packageName, workspace]) => {
      byName[packageName] = workspace.rawPackageJson;
      return byName;
    },
    pkgByName,
  );

  // a map of all package.json contents, indexed by directory name
  const pkgByPath: PackageByPath = {};
  const packageJsonsByPackagePath = Object.entries(workspacesMap).reduce(
    (byPath, [packageName, { location }]) => {
      const workspace = workspaces.get(packageName);
      // @modular-scripts/workspace-resolver should guarantee a 1:1 relationship of items in workspaces and workspacesMap
      if (!workspace) {
        throw new Error(
          'Modular was not able to understand your workspaces configuration',
        );
      }
      const { rawPackageJson } = workspace;
      byPath[location] = rawPackageJson;

      return byPath;
    },
    pkgByPath,
  );

  // TODO: do a quick check to make sure workspaces aren't
  // explicitly included in dependencies
  // maybe that belongs in `modular check`

  const typescriptConfig: TSConfig = {};
  // validate tsconfig
  // Extract configuration from config file and parse JSON,
  // after removing comments. Just a fancier JSON.parse
  const result = ts.parseConfigFileTextToJson(
    path.join(modularRoot, typescriptConfigFilename),
    fse.readFileSync(typescriptConfigFilename, 'utf8').toString(),
  );

  const configObject = result.config as TSConfig;

  if (!configObject) {
    reportTSDiagnostics(':root', [result.error as ts.Diagnostic]);
    throw new Error('Failed to load Typescript configuration');
  }
  Object.assign(typescriptConfig, configObject, {
    // TODO: should probably include the original exclude in this
    exclude: distinct([
      // all TS test files, regardless whether co-located or in test/ etc
      '**/*.stories.ts',
      '**/*.stories.tsx',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.e2e.ts',
      '**/*.spec.tsx',
      '**/*.test.tsx',
      '**/__tests__',
      '**/dist-cjs',
      '**/dist-es',
      '**/dist-types',
      // TS defaults below
      'node_modules',
      'bower_components',
      'jspm_packages',
      'tmp',
      // Casting so that configObject.exclude is set to the correct typing
      // Since configObject is a index type all values are "any" implicitly.
      ...((configObject.exclude as string[]) || []),
    ]),
  });

  typescriptConfig.compilerOptions = typescriptConfig.compilerOptions || {};
  Object.assign(typescriptConfig.compilerOptions, {
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    incremental: false,
  });

  return {
    packageNames,
    rootPackageJsonDependencies,
    packageJsons,
    typescriptConfig,
    packageJsonsByPackagePath,
  };
}

export default memoize(getPackageMetadata);
