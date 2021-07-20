import { JSONSchemaForTheTypeScriptCompilerSConfigurationFile as TSConfig } from '@schemastore/tsconfig';
import * as path from 'path';
import * as ts from 'typescript';
import * as fse from 'fs-extra';
import { getLogger } from './getLogger';
import { reportTSDiagnostics } from '../utils/reportTSDiagnostics';
import getPackageMetadata from '../utils/getPackageMetadata';

const outputDirectory = 'dist';
const typescriptConfigFilename = 'tsconfig.json';

export async function makeTypings(packagePath: string): Promise<void> {
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
  tsconfig.include = [`${packagePath}/src`];
  tsconfig.compilerOptions = {
    ...tsconfig.compilerOptions,
    declarationDir: `${packagePath}/${outputDirectory}-types`,
    rootDir: `${packagePath}/src`,
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

  // Report errors
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);
  if (diagnostics.length > 0) {
    reportTSDiagnostics(packagePath, diagnostics);
    throw new Error('Could not generate .d.ts files');
  }
}
