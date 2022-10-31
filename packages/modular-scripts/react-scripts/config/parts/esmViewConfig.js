'use strict';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { parsePackageName } = require('../utils/esmUtils');
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

function createPluginConfig({ isEnvProduction }) {
  return {
    plugins: [
      // We need to provide a synthetic index.html in case we're starting a ESM view
      !isEnvProduction &&
        new HtmlWebpackPlugin(
          Object.assign(
            {},
            {
              inject: true,
              templateContent: `
                <!DOCTYPE html>
                <html>
                  <body>
                    <div id="root"></div>
                  </body>
                </html>
                `,
              scriptLoading: 'module',
            },
          ),
        ),
    ].filter(Boolean),
  };
}

function createExternalRewriter(dependencyMap) {
  return function rewriteExternals({ request }, callback) {
    const parsedModule = parsePackageName(request);

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
    ? `import { createRoot } from "react-dom/client";
import React from "react";
import Component from "${entryPointPath}";
const container = document.getElementById("root");
const root = createRoot(container);
root.render(React.createElement(Component, null));`
    : `import ReactDOM from "react-dom"
import React from "react";
import Component from "${entryPointPath}";
const DOMRoot = document.getElementById("root");
ReactDOM.render(React.createElement(Component, null), DOMRoot);`;

  const base64 = Buffer.from(content).toString('base64');
  return `./src/_trampoline.js!=!data:text/javascript;base64,${base64}`;
}

module.exports = { createConfig, createPluginConfig };
