'use strict';
const fs = require('fs-extra');
const parse5 = require('parse5');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InterpolateHtmlPlugin = require('../../../react-dev-utils/InterpolateHtmlPlugin');
const { parsePackageName } = require('../utils/esmUtils');
const dedent = require('dedent');
const path = require('path');

function createConfig({
  dependencyMap,
  paths,
  isEnvProduction,
  useReactCreateRoot,
}) {
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

function createPluginConfig({ isEnvProduction, styleImports, indexPath, env }) {
  console.log(styleImports);
  let templateContent;

  // If we have an index template in the project, let's use it
  if (indexPath) {
    templateContent = fs.readFileSync(indexPath, 'utf8');

    // Style (global) imports are excluded from the build, so they don't get injected. We have to manually inject them in the index template.
    if (styleImports.length) {
      const page = parse5.parse(templateContent);
      const html = page.childNodes.find((node) => node.nodeName === 'html');
      const head = html.childNodes.find((node) => node.nodeName === 'head');

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
            ${styleImports?.map(
              (importUrl) =>
                `<link rel="stylesheet" href="${importUrl}"></script>`,
            )}
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>`);
  }
  return {
    plugins: [
      !isEnvProduction &&
        new HtmlWebpackPlugin(
          Object.assign(
            {},
            {
              inject: true,
              templateContent,
              scriptLoading: 'module',
            },
          ),
        ),
      new InterpolateHtmlPlugin(HtmlWebpackPlugin, env.raw),
    ].filter(Boolean),
  };
}

function createExternalRewriter(dependencyMap) {
  return function rewriteExternals({ request }, callback) {
    const parsedModule = parsePackageName(request);

    // TODO: this functionality is duplicated from
    // packages/modular-scripts/src/utils/getImportMap.ts and packages/modular-scripts/src/esbuild-scripts/plugins/rewriteDependenciesPlugin.ts
    // When this configuration file is ported to typescript, use only one version.

    // If the module is absolute and it is in the import map, we want to externalise it
    if (
      parsedModule &&
      parsedModule.dependencyName &&
      dependencyMap[parsedModule.dependencyName] &&
      // If this is an absolute export of css we need to deal with it in the loader
      !request.endsWith('.css')
    ) {
      const { dependencyName, submodule } = parsedModule;
      const toRewrite = `${dependencyMap[dependencyName]}${
        submodule ? `/${submodule}` : ''
      }`;

      return callback(null, toRewrite);
    }
    // Otherwise we just want to bundle it
    return callback();
  };
}

// Virtual entrypoint if we're starting a ESM view - see https://github.com/webpack/webpack/issues/6437
function getVirtualTrampoline(paths, useReactCreateRoot) {
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

module.exports = { createConfig, createPluginConfig };
