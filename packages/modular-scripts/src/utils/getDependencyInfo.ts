import { filterDependencies } from './filterDependencies';
import { getPackageDependencies } from './getPackageDependencies';
import {
  buildImportInfo,
  rewriteModuleSpecifier,
  ImportInfo,
} from './importInfo';
import getWorkspaceInfo from './getWorkspaceInfo';
import type { Dependency } from '@schemastore/package';
import getWorkspaceLocation from './getLocation';

export async function getDependencyInfo(target: string): Promise<{
  importInfo: ImportInfo;
  styleImports: Set<string>;
  bundledDependencies: Dependency;
  bundledResolutions: Dependency;
  externalDependencies: Dependency;
  externalResolutions: Dependency;
  selectiveCDNResolutions: Dependency;
  packageDependencies: Dependency;
}> {
  const {
    manifest: packageDependencies,
    resolutions: packageResolutions,
    selectiveCDNResolutions,
    rawImports,
  } = await getPackageDependencies(target);

  // Get workspace info to automatically bundle workspace dependencies
  const workspaceInfo = await getWorkspaceInfo();

  const workspacePath = await getWorkspaceLocation(target);

  // Split dependencies between external and bundled
  const { external: externalDependencies, bundled: bundledDependencies } =
    filterDependencies(workspacePath, {
      dependencies: packageDependencies,
      workspaceInfo,
    });
  const { external: externalResolutions, bundled: bundledResolutions } =
    filterDependencies(workspacePath, {
      dependencies: packageResolutions,
      workspaceInfo,
    });

  const importInfo = buildImportInfo(workspacePath, {
    externalDependencies,
    externalResolutions,
    selectiveCDNResolutions,
  });

  // Generate a list of CSS urls to embed in the synthetic index and output package.json.
  const cssImportList = [...rawImports]
    .filter((moduleSpecifier) => moduleSpecifier.endsWith('.css'))
    .map((cssModuleSpecifier) =>
      rewriteModuleSpecifier(importInfo, cssModuleSpecifier),
    )
    .filter(Boolean) as string[];

  return {
    importInfo,
    styleImports: new Set(cssImportList),
    bundledDependencies,
    bundledResolutions,
    externalDependencies,
    externalResolutions,
    selectiveCDNResolutions,
    packageDependencies,
  };
}
