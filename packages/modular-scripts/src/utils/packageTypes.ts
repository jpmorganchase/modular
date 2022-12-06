import path from 'path';
import fs from 'fs-extra';

import type {
  ModularType,
  PackageType,
  ModularPackageJson,
} from '@modular-scripts/modular-types';

interface PackageTypeDefinition {
  build: boolean;
  test: boolean;
}

type PackageTypeDefinitions = { [Type in PackageType]: PackageTypeDefinition };

const packageTypeDefinitions: PackageTypeDefinitions = {
  app: { build: true, test: true },
  'esm-view': { build: true, test: true },
  view: { build: true, test: true },
  package: { build: true, test: true },
  template: { build: false, test: false },
  source: { build: false, test: true },
};

export const packageTypes = Object.keys(packageTypeDefinitions);

export const ModularTypes: ModularType[] = (
  packageTypes as ModularType[]
).concat(['root']);

export function getModularType(dir: string): ModularType | undefined {
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath) as ModularPackageJson;
    return packageJson.modular?.type || 'package';
  }
}

export default function isModularType(dir: string, type: PackageType): boolean {
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath) as ModularPackageJson;
    return packageJson.modular?.type === type;
  }
  return false;
}

export function isValidModularType(dir: string): boolean {
  return ModularTypes.includes(getModularType(dir) as ModularType);
}

export function isBuildable(type: PackageType): boolean {
  return packageTypeDefinitions[type].build;
}
