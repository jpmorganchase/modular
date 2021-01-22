import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import * as fs from 'fs-extra';
import path from 'path';

export type PackageType = 'app' | 'view' | 'root'; // | 'package', the default

export type ModularPackageJson = PackageJson & {
  modular?: {
    type: PackageType;
  };
};

export default function isModularType(dir: string, type: PackageType): boolean {
  const packageJsonPath = path.join(dir, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath) as ModularPackageJson;
    return packageJson.modular?.type === type;
  }

  return false;
}
