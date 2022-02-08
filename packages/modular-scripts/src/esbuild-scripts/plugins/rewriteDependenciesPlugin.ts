import * as esbuild from 'esbuild';
import type { Dependency } from '@schemastore/package';

export function createRewriteDependenciesPlugin(
  dependencies: Dependency,
): esbuild.Plugin {
  const externalCdnTemplate =
    process.env.EXTERNAL_CDN_TEMPLATE ??
    'https://cdn.skypack.dev/[name]@[version]';

  const externalDenyList = process.env.EXTERNAL_DENY_LIST
    ? process.env.EXTERNAL_DENY_LIST.split(',')
    : [];

  const importMap: Record<string, string> = Object.entries(dependencies).reduce(
    (acc, [name, version]) => {
      if (!externalDenyList.some((filter) => name.startsWith(filter))) {
        return {
          ...acc,
          [name]: externalCdnTemplate
            .replace('[name]', name)
            .replace('[version]', version),
        };
      }
      return acc;
    },
    {},
  );

  const dependencyRewritePlugin: esbuild.Plugin = {
    name: 'dependency-rewrite',
    setup(build) {
      build.onResolve({ filter: /.*/, namespace: 'file' }, (args) => {
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
