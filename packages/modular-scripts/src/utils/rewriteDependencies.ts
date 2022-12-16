import type { Dependency } from '@schemastore/package';
import { getConfig } from './config';

const externalCdnTemplate = getConfig('externalCdnTemplate');

/**
 * Rewrite maps of package,version to package,CDN URL
 * @param  {Dependency} externalDependencies An object mapping package names to version as specified in the workspace or the root's package.json (ranges allowed).
 * @param  {Dependency} externalResolutions An object mapping package names to version as specified in the lockfile (only exact versions).
 * @param  {Dependency} selectiveCDNResolutions An object mapping package names to selective dependency resolutions, as specified by the resolution field in the package.json (see https://classic.yarnpkg.com/lang/en/docs/selective-version-resolutions/).
 * @return {importMap} A Map mapping package names to the correspondent CDN URL to rewrite, according to the template contained in EXTERNAL_CDN_TEMPLATE.
 */

interface RewriteDependenciesParams {
  externalDependencies: Dependency;
  externalResolutions: Dependency;
  selectiveCDNResolutions: Dependency;
}

export function rewriteDependencies({
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
