import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';
import * as path from 'path';
import * as fse from 'fs-extra';

import getModularRoot from '../../utils/getModularRoot';
import getPackageMetadata from '../../utils/getPackageMetadata';

export function getMain(
  packagePath: string,
  includePrivate: boolean,
  packageJson: JSONSchemaForNPMPackageJsonFiles | undefined,
): string {
  let main: string | undefined;

  if (!packageJson) {
    throw new Error(`no package.json in ${packagePath}, bailing...`);
  }

  if (!packageJson.name) {
    throw new Error(`package.json does not have a valid "name", bailing...`);
  }

  if (!packageJson.version) {
    throw new Error(`package.json does not have a valid "version", bailing...`);
  }

  if (packageJson.module) {
    throw new Error(`package.json shouldn't have a "module" field, bailing...`);
  }

  if (packageJson.typings) {
    throw new Error(
      `package.json shouldn't have a "typings" field, bailing...`,
    );
  }

  if (!includePrivate && packageJson.private === true) {
    throw new Error(`${packagePath} is marked private, bailing...`);
  }

  if (packageJson.main) {
    main = packageJson.main;
  } else {
    throw new Error(
      `package.json at ${packagePath} does not have a "main" field, bailing...`,
    );
  }

  if (!fse.existsSync(path.join(getModularRoot(), packagePath, main))) {
    throw new Error(
      `package.json does not have a main file that points to an existing source file, bailing...`,
    );
  }

  return main;
}

export async function getPackageEntryPoints(
  packagePath: string,
  includePrivate: boolean,
): Promise<string> {
  const { packageJsonsByPackagePath } = await getPackageMetadata();

  const packageJson = packageJsonsByPackagePath[packagePath];

  return getMain(packagePath, includePrivate, packageJson);
}
