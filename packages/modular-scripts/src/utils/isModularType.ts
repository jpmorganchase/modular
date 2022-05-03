import type { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import * as path from 'path';
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

export type ModularTemplateType = 'app' | 'esm-view' | 'view' | 'package';
export type PackageType = ModularTemplateType | 'template';

export type ModularType = PackageType | 'root';

export type ModularPackageJson = PackageJson & {
  browserslist?: Record<string, string[]>;
  modular?: {
    type: ModularType;
    templateType?: ModularTemplateType;
  };
};

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

export function isValidModularRootPackageJson(dir: string): boolean {
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath) as ModularPackageJson;
    return (
      packageJson.modular?.type === 'root' &&
      !!packageJson.private &&
      !!packageJson?.workspaces?.includes('packages/**')
    );
  }
  return false;
}
