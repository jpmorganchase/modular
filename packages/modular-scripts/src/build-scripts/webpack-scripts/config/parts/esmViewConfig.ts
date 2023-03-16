import HtmlWebpackPlugin from 'html-webpack-plugin';
import dedent from 'dedent';
import path from 'path';
import webpack, { Configuration } from 'webpack';
import { parsePackageName } from '../../../../utils/parsePackageName';
import { rewriteModuleSpecifier } from '../../../../utils/buildImportMap';
import fs from 'fs-extra';
import parse5 from 'parse5';
import type { Element } from 'parse5/dist/tree-adapters/default';
import type { Paths } from '../../../common-scripts/determineTargetPaths';
import { WebpackConfiguration } from 'webpack-dev-server';

export function createEsmViewConfig(
  dependencyMap: Map<string, string>,
  paths: Paths,
  isEnvProduction: boolean,
  useReactCreateRoot: boolean,
): WebpackConfiguration {
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
  return function test(
    { request }: { request?: string },
    callback: (
      err?: Error,
      result?: string | boolean | string[] | { [index: string]: unknown },
    ) => void,
  ) {
    if (request) {
      const parsedModule = parsePackageName(request);
      // If the module is absolute and it is in the import map, we want to externalise it
      if (
        parsedModule &&
        parsedModule.dependencyName &&
        dependencyMap.get(parsedModule.dependencyName) &&
        // If this is an absolute export of css we need to deal with it in the loader
        !request.endsWith('.css')
      ) {
        const toRewrite = rewriteModuleSpecifier(dependencyMap, request);
        return callback(undefined, toRewrite);
      }
    }
    // Otherwise we just want to bundle it
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
  indexPath: string | false,
): Configuration {
  const importUrlLinks: string[] = [];
  styleImports.forEach((importUrl) => {
    importUrlLinks.push(`<link rel="stylesheet" href="${importUrl}"></script>`);
  });
  let templateContent;

  // If we have an index template in the project, let's use it
  if (indexPath) {
    templateContent = fs.readFileSync(indexPath, 'utf8');

    // Style (global) imports are excluded from the build, so they don't get injected. We have to manually inject them in the index template.
    if (styleImports.size) {
      const page = parse5.parse(templateContent);
      const html = page.childNodes.find(
        (node) => node.nodeName === 'html',
      ) as Element;
      const head = html.childNodes.find(
        (node) => node.nodeName === 'head',
      ) as Element;

      styleImports.forEach((importUrl) =>
        head.childNodes.push(
          ...parse5.parseFragment(
            `<link rel="stylesheet" href="${importUrl}" />`,
          ).childNodes,
        ),
      );
      templateContent = parse5.serialize(page);
    }
  } else {
    // Standard minimal template to start an esm-view
    templateContent = dedent(`
      <!DOCTYPE html>
        <html>
          <head>
          ${importUrlLinks.join('\n')}
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>`);
  }

  return {
    plugins: [
      // We need to provide a synthetic index.html in case we're starting a ESM view
      !isEnvProduction &&
        (new HtmlWebpackPlugin({
          inject: true,
          templateContent,
          scriptLoading: 'module',
        }) as unknown as webpack.WebpackPluginInstance),
    ].filter(Boolean) as webpack.WebpackPluginInstance[],
  };
}
