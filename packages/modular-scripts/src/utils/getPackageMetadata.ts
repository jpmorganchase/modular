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

  const rootPackageJson = fse.readJSONSync(
    path.join(modularRoot, 'package.json'),
  ) as ModularPackageJson;

  // workspace definitions
  const rootPackageWorkspaceDefinitions = rootPackageJson.workspaces;

  // dependencies defined at the root
  const rootPackageJsonDependencies = rootPackageJson.dependencies || {};

  // engines defined at the root
  const rootPackageJsonEngines = rootPackageJson.engines;

  // let's populate the above three
  const [workspaces] = await getAllWorkspaces();

  // an array of all the package names
  const packageNames = Array.from(workspaces.keys());

  // a map of all package.json contents, indexed by package name
  const packageJsons: PackageByPath = {};
  const packageJsonsByPackagePath: PackageByPath = {};

  Array.from(workspaces).forEach(([packageName, workspace]) => {
    packageJsons[packageName] = workspace.rawPackageJson;
    if (!packageJsons[packageName].engines) {
      // If engines field is not defined in the package's package.json, inherit it from the root package.json
      packageJsons[packageName].engines = rootPackageJsonEngines;
    }
    packageJsonsByPackagePath[workspace.location] = workspace.rawPackageJson;
  });

  // TODO: do a quick check to make sure workspaces aren't
  // explicitly included in dependencies
  // maybe that belongs in `modular check`

  const typescriptConfig: TSConfig = {};
  // validate tsconfig
  // Extract configuration from config file and parse JSON,
  // after removing comments. Just a fancier JSON.parse
  const userTsConfigPath = path.join(modularRoot, typescriptConfigFilename);
  const result = ts.parseConfigFileTextToJson(
    userTsConfigPath,
    fse.readFileSync(userTsConfigPath, 'utf8').toString(),
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
    rootPackageWorkspaceDefinitions,
    rootPackageJsonDependencies,
    rootPackageJsonEngines,
    packageJsons,
    typescriptConfig,
    packageJsonsByPackagePath,
  };
}

export default memoize(getPackageMetadata);
