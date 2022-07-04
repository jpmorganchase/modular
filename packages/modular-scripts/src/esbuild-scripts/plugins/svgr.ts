import * as fs from 'fs-extra';
import esbuild from 'esbuild';
import { createRequire } from 'module';

import * as svgr from '@svgr/core';
import path from 'path';
import getModularRoot from '../../utils/getModularRoot';
import { normalizeToPosix } from '../utils/formatPath';

const svgrOptions: svgr.Config = {
  template(variables, { tpl }) {
    return tpl`
  ${variables.imports};
  
  ${variables.interfaces};
  
  export function ${variables.componentName}(${variables.props}) {
    return (
      ${variables.jsx}
    );
  }
  `;
  },
};

function createPlugin(): esbuild.Plugin {
  const plugin: esbuild.Plugin = {
    name: 'svgr',
    setup(build) {
      const modularRoot = getModularRoot();

      const fileContent = new Map<string, string>();

      function readModularContent(pathName: string) {
        if (fileContent.has(pathName)) {
          return fileContent.get(pathName) as string;
        } else {
          const joinedPath = path.join(modularRoot, pathName);
          const content = fs.readFileSync(joinedPath, 'utf8');
          fileContent.set(pathName, content);
          return Promise.resolve(content);
        }
      }

      build.onResolve({ filter: /@svgurl:.*/ }, (args) => {
        return {
          pluginData: {
            ...args,
          },
          path: args.path.slice('@svgurl:'.length),
          namespace: 'svgurl',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'svgurl' }, async (args) => {
        const { resolveDir } = args.pluginData as esbuild.OnResolveArgs;

        const contents = await readModularContent(args.path);

        return {
          resolveDir,
          contents,
          loader: 'file',
        };
      });

      build.onResolve({ filter: /\.svg$/, namespace: 'file' }, (args) => {
        const resolver = createRequire(args.importer);
        const resolvedPathName = resolver.resolve(args.path);

        return {
          pluginData: {
            ...args,
          },
          path: resolvedPathName,
        };
      });

      build.onLoad({ filter: /\.svg$/, namespace: 'file' }, async (args) => {
        const pluginData = args.pluginData as esbuild.OnResolveArgs;
        const pathName = path.relative(modularRoot, args.path);

        const contents = await readModularContent(pathName);

        if (pluginData.kind === 'url-token') {
          return {
            resolveDir: pluginData.resolveDir,
            contents,
            loader: 'dataurl',
          };
        } else {
          const transformedContents: string = await svgr.transform(
            contents,
            svgrOptions,
            {
              componentName: 'ReactComponent',
            },
          );

          const normalizedPath = normalizeToPosix(pathName);
          const contentsWrapper = `
          export { default } from "@svgurl:${normalizedPath}";
          
          ${transformedContents}
          `;

          return {
            resolveDir: pluginData.resolveDir,
            contents: contentsWrapper,
            loader: 'jsx',
          };
        }
      });
    },
  };

  return plugin;
}

export default createPlugin;
