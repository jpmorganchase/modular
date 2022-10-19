import * as esbuild from 'esbuild';
import { parsePackageName } from '../../utils/parsePackageName';
import type { Dependency } from '@schemastore/package';

export function createRewriteDependenciesPlugin(
  externalDependencies: Dependency,
  externalResolutions: Dependency,
  selectiveCDNResolutions: Dependency,
  target?: string[],
): esbuild.Plugin {
  const externalCdnTemplate =
    process.env.EXTERNAL_CDN_TEMPLATE ??
    'https://cdn.skypack.dev/[name]@[version]';

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

  const dependencyRewritePlugin: esbuild.Plugin = {
    name: 'dependency-rewrite',
    setup(build) {
      // Filter on external dependencies
      build.onResolve(
        { filter: /^[a-z0-9-~]|@/, namespace: 'file' },
        (args) => {
          // Get name and eventual submodule to construct the url
          const { dependencyName, submodule } = parsePackageName(args.path);
          // Find dependency name (no submodule) in the pre-built import map
          const dependencyUrl = importMap.get(dependencyName) as string;
          if (dependencyUrl) {
            // Rewrite the path taking the submodule into account
            const path = `${dependencyUrl}${submodule ? `/${submodule}` : ''}`;
            if (submodule?.endsWith('.css')) {
              // This is a global CSS import from the CDN.
              return {
                path,
                namespace: 'rewritable-css-import',
              };
            }
            // Just rewrite and mark as external. It will be ignored the next resolve cycle
            return {
              path,
              external: true,
            } as esbuild.OnResolveResult;
          } else {
            // Dependency has been filtered out: ignore and bundle
            return {};
          }
        },
      );
      build.onLoad(
        { filter: /^[a-z0-9-~]|@/, namespace: 'rewritable-css-import' },
        (args) => {
          // Rewrite to noop placeholder: dependency will be written in output package.json
          // and generated index.html, no need to load it in the page
          return {
            contents: `/* Placeholder for ${args.path} - see package.json */`,
          };
        },
      );
    },
  };
  return dependencyRewritePlugin;
}
