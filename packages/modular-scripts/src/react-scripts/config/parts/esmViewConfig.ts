import HtmlWebpackPlugin from 'html-webpack-plugin';
import dedent from 'dedent';
import path from 'path';
import { Configuration, WebpackPluginInstance } from 'webpack';
import { Paths } from '../../../utils/determineTargetPaths';
import { parsePackageName } from '../../../utils/parsePackageName';
import { rewriteModuleSpecifier } from '../../../utils/buildImportMap';

export function createEsmViewConfig(
  dependencyMap: Map<string, string>,
  paths: Paths,
  isEnvProduction: boolean,
  useReactCreateRoot: boolean,
): Configuration {
  return {
    entry: !isEnvProduction
      ? getVirtualTrampoline(paths, useReactCreateRoot)
      : paths.appIndexJs,
    externals: createExternalRewriter(dependencyMap),
    externalsType: 'module',
    experiments: { outputModule: true },
    output: {
      module: true,
      library: { type: 'module' },
    },
  };
}

function createExternalRewriter(dependencyMap: Map<string, string>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function test(request: any, callback: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const parsedModule = parsePackageName(request);
    // If the module is absolute and it is in the import map, we want to externalise it
    if (
      parsedModule &&
      parsedModule.dependencyName &&
      dependencyMap.get(parsedModule.dependencyName) &&
      // If this is an absolute export of css we need to deal with it in the loader
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      !request.endsWith('.css')
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const toRewrite = rewriteModuleSpecifier(dependencyMap, request);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return callback(null, toRewrite);
    }
    // Otherwise we just want to bundle it
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return callback();
  };
}

// Virtual entrypoint if we're starting a ESM view - see https://github.com/webpack/webpack/issues/6437
function getVirtualTrampoline(paths: Paths, useReactCreateRoot: boolean) {
  // Build the relative path between the root and the entrypoint.
  const relativeEntrypointPath = path
    .relative(paths.appPath, paths.appIndexJs)
    .split(path.sep)
    .join(path.posix.sep); // Separator could be win32 on Windows system, since it comes from a filesystem path. Force it to be posix since it's an URL

  const entryPointPath = `./${relativeEntrypointPath}`;
  const content = useReactCreateRoot
    ? // use the new createRoot API with React >= 18. The old one is backwards compatible, but will warn on develop.
      dedent(`import { createRoot } from "react-dom/client";
    import React from "react";
    import Component from "${entryPointPath}";
    const container = document.getElementById("root");
    const root = createRoot(container);
    root.render(React.createElement(Component, null));`)
    : // use the old ReactDOM.render API with React < 18.
      dedent(`import ReactDOM from "react-dom"
    import React from "react";
    import Component from "${entryPointPath}";
    const DOMRoot = document.getElementById("root");
    ReactDOM.render(React.createElement(Component, null), DOMRoot);`);

  const base64 = Buffer.from(content).toString('base64');
  return `./src/_trampoline.js!=!data:text/javascript;base64,${base64}`;
}

export function createEsmViewPluginConfig(
  isEnvProduction: boolean,
  styleImports: Set<string>,
): { plugins: WebpackPluginInstance[] } {
  const importUrlLinks: string[] = [];
  styleImports.forEach((importUrl) => {
    importUrlLinks.push(`<link rel="stylesheet" href="${importUrl}"></script>`);
  });
  return {
    plugins: [
      // We need to provide a synthetic index.html in case we're starting a ESM view
      !isEnvProduction &&
        (new HtmlWebpackPlugin({
          inject: true,
          templateContent: `
                  <!DOCTYPE html>
                  <head>
                  ${importUrlLinks.join()}
                  </head>
                  <html>
                    <body>
                      <div id="root"></div>
                    </body>
                  </html>
                  `,
          scriptLoading: 'module',
        }) as WebpackPluginInstance),
    ].filter(Boolean) as WebpackPluginInstance[],
  };
}
