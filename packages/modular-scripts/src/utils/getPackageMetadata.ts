import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import { JSONSchemaForTheTypeScriptCompilerSConfigurationFile as TSConfig } from '@schemastore/tsconfig';
import * as path from 'path';
import * as ts from 'typescript';
import * as fse from 'fs-extra';

import getModularRoot from '../utils/getModularRoot';
import { getAllWorkspaces } from '../utils/getAllWorkspaces';
import { reportTSDiagnostics } from './reportTSDiagnostics';

import memoize from '../utils/memoize';

const typescriptConfigFilename = 'tsconfig.json';

function distinct<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

async function getPackageMetadata() {
  const modularRoot = getModularRoot();

  // dependencies defined at the root
  const rootPackageJsonDependencies =
    (fse.readJSONSync(path.join(modularRoot, 'package.json')) as PackageJson)
      .dependencies || {};

  // a map of all package.json contents, indexed by package name
  const packageJsons: { [key: string]: PackageJson } = {};
  // a map of all package.json contents, indexed by directory name

  const packageJsonsByPackagePath: {
    [key: string]: PackageJson;
  } = {};

  // an array of all the package names
  const packageNames: string[] = [];

  // let's populate the above three
  const workspace = await getAllWorkspaces();
  for (const [name, { location }] of Object.entries(workspace)) {
    const pathToPackageJson = path.join(modularRoot, location, 'package.json');
    const packageJson = fse.readJsonSync(pathToPackageJson) as PackageJson;

    packageJsons[name] = packageJson;
    packageJsonsByPackagePath[location] = packageJson;
    packageNames.push(name);
  }

  // TODO: the above should probably be lazily evaluated.

  // TODO: do a quick check to make sure workspaces aren't
  // explicitly included in dependencies
  // maybe that belongs in `modular check`

  const publicPackageJsons: {
    [name: string]: PackageJson;
  } = {};

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
      '__tests__',
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
    declarationDir: 'dist',
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
    publicPackageJsons,
  };
}

export default memoize(getPackageMetadata);
