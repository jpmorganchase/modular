import { parsePackageName } from './parsePackageName';
import type { Dependency } from '@schemastore/package';

const externalCdnTemplate =
  process.env.EXTERNAL_CDN_TEMPLATE ??
  'https://cdn.skypack.dev/[name]@[version]';

interface RewriteDependenciesParams {
  externalDependencies: Dependency;
  externalResolutions: Dependency;
  selectiveCDNResolutions: Dependency;
}

export function getImportMap({
  externalDependencies,
  externalResolutions,
  selectiveCDNResolutions,
}: RewriteDependenciesParams): Map<string, string> {
  // Add react-dom if only react is specified in the dependencies
  if (!externalDependencies['react-dom']) {
    externalDependencies['react-dom'] = externalDependencies['react'];
  }
  if (!externalResolutions['react-dom']) {
    externalResolutions['react-dom'] = externalResolutions['react'];
  }

  // Generate an import map
  const importMap: Map<string, string> = new Map(
    Object.entries(externalDependencies).map(([name, version]) => {
      if (!externalResolutions[name]) {
        throw new Error(
          `Dependency ${name} found in package.json but not in lockfile. Have you installed your dependencies?`,
        );
      }
      return [
        name,
        externalCdnTemplate
          .replace('[name]', name)
          .replace('[version]', version ?? externalResolutions[name])
          .replace('[resolution]', externalResolutions[name])
          .replace(
            '[selectiveCDNResolutions]',
            selectiveCDNResolutions
              ? Object.entries(selectiveCDNResolutions)
                  .map(([key, value]) => `${key}@${value}`)
                  .join(',')
              : '',
          ),
      ];
    }),
  );

  return importMap;
}

export function rewriteModuleSpecifier(
  importMap: Map<string, string>,
  moduleSpecifier: string,
): string | undefined {
  const { dependencyName, submodule } = parsePackageName(moduleSpecifier);
  // Find dependency name (no submodule) in the pre-built import map
  const dependencyUrl = dependencyName
    ? (importMap.get(dependencyName) as string)
    : undefined;
  if (dependencyUrl) {
    // Rewrite the path taking the submodule into account
    return `${dependencyUrl}${submodule ? `/${submodule}` : ''}`;
  }
}
