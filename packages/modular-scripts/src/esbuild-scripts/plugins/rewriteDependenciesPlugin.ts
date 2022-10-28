import * as esbuild from 'esbuild';
import { rewriteModuleSpecifier } from '../../utils/getImportMap';

export function createRewriteDependenciesPlugin(
  importMap: Map<string, string>,
  target?: string[],
): esbuild.Plugin {
  const dependencyRewritePlugin: esbuild.Plugin = {
    name: 'dependency-rewrite',
    setup(build) {
      // Filter on external dependencies
      build.onResolve(
        { filter: /^[a-z0-9-~]|@/, namespace: 'file' },
        (args) => {
          // Construct the full url from import map
          const path = rewriteModuleSpecifier(importMap, args.path);
          if (path) {
            // Rewrite the path taking the submodule into account
            if (path.endsWith('.css')) {
              // This is a global CSS import from the CDN. Mark for rewriting with a placeholder.
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
