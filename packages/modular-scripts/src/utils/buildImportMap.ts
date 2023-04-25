import { parsePackageName } from './parsePackageName';
import type { Dependency } from '@schemastore/package';
import { getConfig } from './config';

interface BuildImportMapParams {
  externalDependencies: Dependency;
  externalResolutions: Dependency;
  selectiveCDNResolutions: Dependency;
}

export interface ImportInfo {
  importMap: Map<string, string>;
  externalDependencies: Dependency;
  externalResolutions: Dependency;
  selectiveCDNResolutions: Dependency;
  externalCdnTemplate: string;
}

export function buildImportMap(
  workspacePath: string,
  {
    externalDependencies,
    externalResolutions,
    selectiveCDNResolutions,
  }: BuildImportMapParams,
): ImportInfo {
  const externalCdnTemplate = getConfig('externalCdnTemplate', workspacePath);

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

  return {
    importMap,
    externalResolutions,
    selectiveCDNResolutions,
    externalDependencies,
    externalCdnTemplate,
  };
}

export function rewriteModuleSpecifier(
  importInfo: ImportInfo,
  moduleSpecifier: string,
): string | undefined {
  const {
    externalCdnTemplate,
    externalResolutions,
    externalDependencies,
    selectiveCDNResolutions,
  } = importInfo;
  const { dependencyName: name, submodule } = parsePackageName(moduleSpecifier);

  if (name && externalDependencies[name]) {
    const resolution = externalResolutions[name];
    const version = externalDependencies[name] ?? externalResolutions[name];
    console.log({ selectiveCDNResolutions, resolution, version });
    const dependencyUrl = externalCdnTemplate
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
      );

    return `${dependencyUrl}${submodule ? `/${submodule}` : ''}`;
  }
}
