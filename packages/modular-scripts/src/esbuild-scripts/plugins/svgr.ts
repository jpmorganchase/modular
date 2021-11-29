import * as fs from 'fs-extra';
import esbuild from 'esbuild';
import { createRequire } from 'module';

import svgr from '@svgr/core';
import path from 'path';
import getModularRoot from '../../utils/getModularRoot';

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
          const content = fs.readFileSync(
            joinedPath,
            'utf8',
          );
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
          namespace: 'svgurl'
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

      build.onResolve({ filter: /@svgr:.*/ }, (args) => {
        return {
          pluginData: {
            ...args,
          },
          path: args.path.slice('@svgr:'.length),
          namespace: 'svgr',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'svgr' }, async (args) => {
        const contents = await readModularContent(args.path);

        const transformedContents: string = await svgr(contents);

        const { resolveDir } = args.pluginData as esbuild.OnResolveArgs;

        return {
          resolveDir,
          contents: transformedContents,
          loader: 'jsx',
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


        if (pluginData.kind === 'url-token') {
          const contents = await readModularContent(pathName);

          return {
            resolveDir: pluginData.resolveDir,
            contents,
            loader: 'dataurl',
          };
        } else {
          const contents = `
export { default } from "@svgurl:${pathName}";
export { default as ReactComponent } from "@svgr:${pathName}";
`;
          return {
            resolveDir: pluginData.resolveDir,
            contents,
            loader: 'jsx',
          };
        }
      });
    },
  };

  return plugin;
}

export default createPlugin;
