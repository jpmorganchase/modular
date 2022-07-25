export type ModularTemplateType = 'app' | 'esm-view' | 'view' | 'package';
export type PackageType = ModularTemplateType | 'template';
export type UnknownType = 'unknown';

export type ModularType = PackageType | UnknownType | 'root';

export type ModularWorkspacePackage = {
  path: string;
  name: string;
  version: string;
  workspace: boolean;
  modular: {
    type: ModularType;
  };
  children: ModularWorkspacePackage[];
  parent: ModularWorkspacePackage | null;
};
