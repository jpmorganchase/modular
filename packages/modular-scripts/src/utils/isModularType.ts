import * as path from 'path';

import type { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import type {
  ModularType,
  PackageType,
  ModularTemplateType,
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

// Utility type that extends type `T1` with the fields of type `T2`
type Extend<T1, T2> = {
  [k in keyof (T1 & T2)]: k extends keyof T2
    ? T2[k]
    : k extends keyof T1
    ? T1[k]
    : never;
};

type PackageJsonOverrides = {
  browserslist?: Record<string, string[]>;
  modular?: {
    type: ModularType;
    templateType?: ModularTemplateType;
  };
  workspaces?:
    | string[]
    | {
        packages?: string[];
        nohoist?: string[];
      };
};

export type ModularPackageJson = Extend<PackageJson, PackageJsonOverrides>;

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
