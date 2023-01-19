import path from 'path';
import fs from 'fs-extra';

import type {
  ModularType,
  PackageType,
  ModularPackageJson,
} from '@modular-scripts/modular-types';

interface PackageTypeDefinition {
  buildable: boolean;
  testable: boolean;
  startable: boolean;
}

type PackageTypeDefinitions = { [Type in PackageType]: PackageTypeDefinition };

const packageTypeDefinitions: PackageTypeDefinitions = {
  app: { buildable: true, testable: true, startable: true },
  'esm-view': { buildable: true, testable: true, startable: true },
  view: { buildable: true, testable: true, startable: true },
  package: { buildable: true, testable: true, startable: false },
  template: { buildable: false, testable: false, startable: false },
  source: { buildable: false, testable: true, startable: false },
};

export const ModularTypes: ModularType[] = (
  Object.keys(packageTypeDefinitions) as ModularType[]
).concat(['root']);

export function getModularType(dir: string): ModularType | undefined {
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath) as ModularPackageJson;
    return packageJson.modular?.type;
  }
}

export function isModularType(dir: string, type: PackageType): boolean {
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath) as ModularPackageJson;
    return packageJson.modular?.type === type;
  }
  return false;
}

export function isValidModularType(type: string): boolean {
  return ModularTypes.includes(type as ModularType);
}

export function isBuildableModularType(type: PackageType): boolean {
  return Boolean(packageTypeDefinitions[type]?.buildable);
}

export function isStartableModularType(type: PackageType): boolean {
  return Boolean(packageTypeDefinitions[type]?.startable);
}
