import type { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';

export type ModularTemplateType =
  | 'app'
  | 'esm-view'
  | 'view'
  | 'package'
  | 'source';
export type PackageType = ModularTemplateType | 'template';
export type UnknownType = 'unknown';

export type ModularType = PackageType | UnknownType | 'root';

export type ModularConfiguration = {
  type: ModularType | undefined;
};

export type ModularWorkspacePackage = {
  path: string;
  location: string;
  name: string;
  version: string;
  workspace: boolean;
  modular?: ModularConfiguration;
  type: ModularType | undefined;
  children: ModularWorkspacePackage[];
  parent: ModularWorkspacePackage | null;
  dependencies: Record<string, string> | undefined;
  rawPackageJson: ModularPackageJson;
};

// Represents an exposed package.json that can be consumed via a RemoteView
export type MicrofrontendManifest = {
  name: string;
  module: string;
  style?: string;
  styleImports?: string[];
  modular?: ModularConfiguration;
};

export interface WorkspaceDependencyObject {
  workspaceDependencies: string[];
}

export interface WorkspaceObj extends WorkspaceDependencyObject {
  location: string;
  mismatchedWorkspaceDependencies: string[];
}

export type WorkspaceMap = Record<string, WorkspaceObj>;

export type WorkspaceContent = [
  Map<string, ModularWorkspacePackage>,
  WorkspaceMap,
];

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
