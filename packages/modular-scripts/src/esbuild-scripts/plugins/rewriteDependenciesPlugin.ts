import * as esbuild from 'esbuild';
import type { Dependency } from '@schemastore/package';

export function createRewriteDependenciesPlugin(
  dependencies: Dependency,
): esbuild.Plugin {
  const externalCdnTemplate =
    process.env.EXTERNAL_CDN_TEMPLATE ??
    'https://cdn.skypack.dev/[name]@[version]';

  const externalBlockList = process.env.EXTERNAL_BLOCK_LIST
    ? process.env.EXTERNAL_BLOCK_LIST.split(',')
    : [];

  const importMap: Record<string, string> = Object.entries(dependencies).reduce(
    (acc, [name, version]) => {
      if (!externalBlockList.some((filter) => name.startsWith(filter))) {
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
        if (args.path.startsWith('.')) {
          return {};
        }
        const { dependencyName /*, scope, module, submodule */ } =
          parsePackageName(args.path);
        // TODO pass the rest as data
        if (dependencyName in dependencies) {
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

const packageRegex =
  /^(@[a-z0-9-~][a-z0-9-._~]*)?\/?([a-z0-9-~][a-z0-9-._~]*)\/?(.*)/;
function parsePackageName(name: string) {
  const parsedName = packageRegex.exec(name);
  if (!parsedName) {
    throw new Error(`Can't parse package name: ${name}`);
  }
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [_, scope, module, submodule] = parsedName;
  const dependencyName = scope ?? '' + module;
  return { dependencyName, scope, module, submodule };
}
