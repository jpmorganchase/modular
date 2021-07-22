import { JSONSchemaForTheTypeScriptCompilerSConfigurationFile as TSConfig } from '@schemastore/tsconfig';
import * as path from 'path';
import { paramCase as toParamCase } from 'change-case';
import * as ts from 'typescript';
import * as fse from 'fs-extra';
import isCI from 'is-ci';

import { getLogger } from './getLogger';
import getModularRoot from '../utils/getModularRoot';
import { reportTSDiagnostics } from '../utils/reportTSDiagnostics';
import getPackageMetadata from '../utils/getPackageMetadata';
import getRelativeLocation from '../utils/getRelativeLocation';

const outputDirectory = 'dist';
const typescriptConfigFilename = 'tsconfig.json';

export async function makeTypings(target: string): Promise<void> {
  const modularRoot = getModularRoot();
  const packagePath = await getRelativeLocation(target);
  const targetOutputDirectory = path.join(
    modularRoot,
    outputDirectory,
    toParamCase(target),
  );
  const logger = getLogger(packagePath);

  const { typescriptConfig } = await getPackageMetadata();

  logger.log('generating .d.ts files');

  // make a shallow copy of the configuration
  const tsconfig: TSConfig = {
    ...typescriptConfig,
    compilerOptions: {
      ...typescriptConfig.compilerOptions,
    },
  };

  // then add our custom stuff
  // Only include src files from the package to prevent already built
  // files from interferring with the compile
  tsconfig.include = [path.join(modularRoot, packagePath, `src`)];
  tsconfig.compilerOptions = {
    ...tsconfig.compilerOptions,
    declarationDir: path.join(
      targetOutputDirectory,
      `${outputDirectory}-types`,
    ),
    rootDir: path.join(modularRoot, packagePath, `src`),
    diagnostics: !isCI,
  };

  // Extract config information
  const configParseResult = ts.parseJsonConfigFileContent(
    tsconfig,
    ts.sys,
    path.dirname(typescriptConfigFilename),
  );

  if (configParseResult.errors.length > 0) {
    reportTSDiagnostics(packagePath, configParseResult.errors);
    throw new Error('Could not parse Typescript configuration');
  }

  const host = ts.createCompilerHost(configParseResult.options);
  host.writeFile = (fileName, contents) => {
    fse.mkdirpSync(path.dirname(fileName));
    fse.writeFileSync(fileName, contents);
  };

  // Compile
  const program = ts.createProgram(
    configParseResult.fileNames,
    configParseResult.options,
    host,
  );

  const emitResult = program.emit();

  // Skip disagnostic reporting in CI
  if (isCI) {
    return;
  }
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);
  if (diagnostics.length > 0) {
    reportTSDiagnostics(packagePath, diagnostics);
    throw new Error('Could not generate .d.ts files');
  }
}
