import * as path from 'path';

import type {
  ModularType,
  PackageType,
  ModularPackageJson,
} from 'modular-types';

import * as fs from 'fs-extra';

export const packageTypes: PackageType[] = [
  'app',
  'esm-view',
  'view',
  'package',
  'template',
];
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
