import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import { JSONSchemaForTheTypeScriptCompilerSConfigurationFile as TSConfig } from '@schemastore/tsconfig';

import * as fse from 'fs-extra';
import * as path from 'path';
import * as ts from 'typescript';

import { getAllWorkspaces } from '../utils/getAllWorkspaces';
import getModularRoot from '../utils/getModularRoot';
import memoize from '../utils/memoize';
import { reportTSDiagnostics } from './reportTSDiagnostics';

const outputDirectory = 'dist';
const typescriptConfigFilename = 'tsconfig.json';

function getPackageMetadata() {
  // dependencies defined at the root
  const rootPackageJsonDependencies =
    (
      fse.readJSONSync(
        path.join(getModularRoot(), 'package.json'),
      ) as PackageJson
    ).dependencies || {};

  // a map of all package.json contents, indexed by package name
  const packageJsons: { [key: string]: PackageJson } = {};
  // a map of all package.json contents, indexed by directory name
  const packageJsonsByPackagePath: {
    [key: string]: PackageJson;
  } = {};
  // an array of all the package names
  const packageNames: string[] = [];

  // let's populate the above three
  for (const [name, { location }] of Object.entries(getAllWorkspaces())) {
    const pathToPackageJson = path.join(location, 'package.json');
    const packageJson = fse.readJsonSync(pathToPackageJson) as PackageJson;

    packageJsons[name] = packageJson;
    packageJsonsByPackagePath[
      location.replace(new RegExp('^packages\\/'), '')
    ] = packageJson;
    packageNames.push(name);
  }

  // TODO: the above should probably be lazily evaluated.

  // TODO: do a quick check to make sure workspaces aren't
  // explicitly included in dependencies
  // maybe that belongs in `modular check`

  const publicPackageJsons: {
    [name: string]: PackageJson;
  } = {};

  function distinct<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }

  const typescriptConfig: TSConfig = {};
  // validate tsconfig

  // Extract configuration from config file and parse JSON,
  // after removing comments. Just a fancier JSON.parse
  const result = ts.parseConfigFileTextToJson(
    path.join(getModularRoot(), typescriptConfigFilename),
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
    declarationDir: outputDirectory,
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    incremental: false,
  });

  return {
    packageNames,
    packageJsons,
    publicPackageJsons,
    rootPackageJsonDependencies,
    packageJsonsByPackagePath,
    typescriptConfig,
  };
}

export default memoize(getPackageMetadata);
