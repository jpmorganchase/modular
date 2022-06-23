import * as fs from 'fs-extra';
import path from 'path';
import { CoreProperties } from '@schemastore/package';
import { StandAloneBuilderContext } from './createBuilderContext';

export async function generateTargetPackageJson(
  context: StandAloneBuilderContext,
) {
  const { jsEntryPoint, paths, cssEntryPoint, targetDirectory, dependencies } =
    context;

  if (!dependencies) {
    throw new Error(
      `generateAssetsWithEsbuild: cannot run without a dependencies map`,
    );
  }

  const input = (await fs.readJSON(
    path.join(targetDirectory, 'package.json'),
  )) as CoreProperties;
  input.dependencies = dependencies.packageDependencies;
  input.bundledDependencies = Object.keys(dependencies.bundledDependencies);

  const output = {
    name: input.name,
    version: input.version,
    license: input.license,
    modular: input.modular,
    dependencies: input.dependencies,
    bundledDependencies: input.bundledDependencies,
    module: jsEntryPoint ? paths.publicUrlOrPath + jsEntryPoint : undefined,
    style: cssEntryPoint ? paths.publicUrlOrPath + cssEntryPoint : undefined,
  };

  await fs.writeJSON(path.join(paths.appBuild, 'package.json'), output, {
    spaces: 2,
  });
}
