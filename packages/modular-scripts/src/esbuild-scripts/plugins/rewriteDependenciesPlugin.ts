import * as esbuild from 'esbuild';
import type { Dependency } from '@schemastore/package';

export function createRewriteDependenciesPlugin(
  externalDependencies: Dependency,
  target?: string[],
): esbuild.Plugin {
  const externalCdnTemplate =
    process.env.EXTERNAL_CDN_TEMPLATE ??
    'https://cdn.skypack.dev/[name]@[version]';

  const importMap: Record<string, string> = Object.entries(
    externalDependencies,
  ).reduce(
    (acc, [name, version]) => ({
      ...acc,
      [name]: externalCdnTemplate
        .replace('[name]', name)
        .replace('[version]', version),
    }),
    {},
  );

  const dependencyRewritePlugin: esbuild.Plugin = {
    name: 'dependency-rewrite',
    setup(build) {
      // Don't want to load global css more than once
      const globalCSSMap: Map<string, boolean> = new Map();
      // Filter on external dependencies
      build.onResolve(
        { filter: /^[a-z0-9-~]|@/, namespace: 'file' },
        (args) => {
          // Get name and eventual submodule to construct the url
          const { dependencyName, submodule } = parsePackageName(args.path);
          // Find dependency name (no submodule) in the pre-built import map
          if (dependencyName in importMap) {
            // Rewrite the path taking the submodule into account
            const path = `${importMap[dependencyName]}${
              submodule ? `/${submodule}` : ''
            }`;
            if (submodule.endsWith('.css')) {
              // This is a global CSS import from the CDN.
              if (target && target.every((target) => target === 'esnext')) {
                // If target is esnext we can use CSS module scripts - https://web.dev/css-module-scripts/
                // esbuild supports them only on an `esnext` target, otherwise the assertion is removed - https://github.com/evanw/esbuild/issues/1871
                // We must create a variable name to not clash with anything else though
                const variableName =
                  `__sheet_${dependencyName}_${submodule}`.replace(
                    /[\W_]+/g,
                    '_',
                  );
                return {
                  path,
                  namespace: 'rewritable-css-import-css-module-scripts',
                  pluginData: { variableName },
                };
              }
              // Fall back to link injection if we don't support CSS module scripts
              // We want to ignore this import if it's been already imported before (no need to inject it twice into the HEAD)
              const namespace = globalCSSMap.get(path)
                ? 'rewritable-css-import-ignore'
                : 'rewritable-css-import';
              // Set it in the "allready done" map
              globalCSSMap.set(path, true);
              return {
                path,
                namespace,
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
          return {
            contents: `
          const link = document.createElement('link');
          link.rel = 'stylesheet'; 
          link.type = 'text/css';
          link.href = '${args.path}'; 
          document.getElementsByTagName('HEAD')[0].appendChild(link); 
          `,
          };
        },
      );
      build.onLoad(
        { filter: /^[a-z0-9-~]|@/, namespace: 'rewritable-css-import-ignore' },
        (args) => {
          return {
            contents: `
            /* Ignored CSS import at path ${args.path} */
            `,
          };
        },
      );
      build.onLoad(
        {
          filter: /^[a-z0-9-~]|@/,
          namespace: 'rewritable-css-import-css-module-scripts',
        },
        (args) => {
          const { variableName } = args.pluginData as { variableName: string };
          return {
            contents: `
            import ${variableName} from '${args.path}' assert { type: 'css' };
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, ${variableName}];
            `,
          };
        },
      );
      build.onStart(() => {
        // Clear the map on start, for incremental mode
        globalCSSMap.clear();
      });
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
  const dependencyName = (scope ? `${scope}/` : '') + module;
  return { dependencyName, scope, module, submodule };
}
