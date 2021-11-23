import * as fs from 'fs-extra';
import esbuild from 'esbuild';

import svgr from '@svgr/core';
import path from 'path';
import getModularRoot from '../../utils/getModularRoot';

function createPlugin(): esbuild.Plugin {
  const plugin: esbuild.Plugin = {
    name: 'svgr',
    setup(build) {
      const modularRoot = getModularRoot();

      build.onResolve({ filter: /@svgr:.*/ }, (args) => {
        const pathName = path.join(
          args.resolveDir,
          args.path.slice('@svgr:'.length),
        );
        const relativePath = path.relative(modularRoot, pathName);

        return {
          pluginData: {
            ...args,
          },
          path: relativePath,
          namespace: 'svgr',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'svgr' }, async (args) => {
        const pluginData = args.pluginData as esbuild.OnResolveArgs;

        const pathName = path.join(
          pluginData.resolveDir,
          pluginData.path.slice('@svgr:'.length),
        );

        const contents: string = await svgr(
          await fs.readFile(pathName, 'utf8'),
        );
        return {
          contents,
          resolveDir: pluginData.resolveDir,
          loader: 'jsx',
        };
      });

      build.onResolve({ filter: /@svgurl:.*/ }, (args) => {
        const pathName = path.join(
          args.resolveDir,
          args.path.slice('@svgurl:'.length),
        );
        return {
          path: pathName,
          namespace: 'svgurl',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'svgurl' }, async (args) => {
        const contents = await fs.readFile(args.path, 'utf8');
        return {
          contents,
          loader: 'file',
        };
      });

      build.onResolve({ filter: /\.svg$/, namespace: 'file' }, (args) => {
        const pathName = path.join(args.resolveDir, args.path);
        const relativePath = path.relative(modularRoot, pathName);
        if (args.kind === 'url-token') {
          return {
            pluginData: {
              ...args,
            },
            path: relativePath,
            namespace: 'modular-svgurl',
          };
        } else {
          return {
            pluginData: {
              ...args,
            },
            path: relativePath,
            namespace: 'modular-svgr',
          };
        }
      });

      build.onLoad(
        { filter: /\.svg$/, namespace: 'modular-svgurl' },
        async (args) => {
          const pluginData = args.pluginData as esbuild.OnResolveArgs;

          const contents = await fs.readFile(pluginData.path, 'utf8');
          return {
            contents,
            loader: 'dataurl',
          };
        },
      );

      build.onLoad({ filter: /\.svg$/, namespace: 'modular-svgr' }, (args) => {
        const pluginData = args.pluginData as esbuild.OnResolveArgs;

        const relativePath = path.relative(pluginData.resolveDir, args.path);
        return {
          resolveDir: pluginData.resolveDir,
          contents: `
                        export { default } from "@svgurl:${relativePath}";
                        export { default as ReactComponent } from "@svgr:${relativePath}";
                    `,
          loader: 'jsx',
        };
      });
    },
  };

  return plugin;
}

export default createPlugin;
