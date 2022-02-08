import * as esbuild from 'esbuild';
import type { Dependency } from '@schemastore/package';

export function createDependenciesRewritePlugin(
  dependencies: Dependency,
): esbuild.Plugin {
  const importMap: Record<string, string> = Object.entries(dependencies).reduce(
    (agg, [dep, version]) => {
      if (
        !dep.startsWith('@cib') &&
        !dep.startsWith('@wssdashboard') &&
        !dep.startsWith('@uilogger')
      ) {
        return {
          ...agg,
          [dep]: `https://cdn.skypack.dev/${dep}@${version}`,
        };
      }

      return agg;
    },
    {},
  );

  console.log({ dependencies });

  const dependencyRewritePlugin: esbuild.Plugin = {
    name: 'dependency-rewrite',
    setup(build) {
      build.onResolve({ filter: /.*/, namespace: 'file' }, (args) => {
        console.log({ onResolve: args.path });
        if (args.path in dependencies) {
          return {
            path: args.path,
            namespace: 'rewrite-dependency',
          } as esbuild.OnResolveResult;
        } else {
          return {};
        }
      });

      build.onLoad(
        { filter: /.*/, namespace: 'rewrite-dependency' },
        (args) => {
          return {
            contents: `export * from "${
              importMap[args.path]
            }"; export {default} from "${importMap[args.path]}"`,
          } as esbuild.OnLoadResult;
        },
      );
    },
  };

  return dependencyRewritePlugin;
}
