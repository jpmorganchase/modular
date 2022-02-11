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
      // Filter on external dependencies
      build.onResolve(
        { filter: /^[a-z0-9-~]|@/, namespace: 'file' },
        (args) => {
          // Get name and eventual submodule to construct the url
          const { dependencyName, submodule } = parsePackageName(args.path);
          // Find dependency name (no submodule) in the pre-built import map
          if (dependencyName in importMap) {
            // Just rewrite and mark as external. It will be ignored the next resolve cycle
            return {
              // If there's a submodule, concatenate it in
              path: `${importMap[dependencyName]}${
                submodule ? `/${submodule}` : ''
              }`,
              external: true,
            } as esbuild.OnResolveResult;
          } else {
            // Dependency has been filtered out: ignore and bundle
            return {};
          }
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