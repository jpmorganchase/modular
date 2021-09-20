import * as fs from 'fs-extra';
import esbuild from 'esbuild';

// @ts-ignore
import svgr from '@svgr/core';
import path from 'path';

function createPlugin(): esbuild.Plugin {
  const plugin: esbuild.Plugin = {
    name: 'svgr',
    setup(build) {
      build.onResolve({ filter: /@svgr:.*/ }, (args) => {
        return {
          path: args.path.slice('@svgr:'.length),
          namespace: 'svgr',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'svgr' }, async (args) => {
        const contents = await svgr(await fs.readFile(args.path, 'utf8'));
        return {
          contents,
          resolveDir: path.dirname(args.path),
          loader: 'jsx',
        };
      });

      build.onResolve({ filter: /@svgurl:.*/ }, (args) => {
        return {
          path: args.path.slice('@svgurl:'.length),
          namespace: 'svgurl',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'svgurl' }, async (args) => {
        const contents = await fs.readFile(args.path, 'utf8');
        return {
          contents,
          resolveDir: path.dirname(args.path),
          loader: 'file',
        };
      });

      build.onLoad({ filter: /\.svg$/, namespace: 'file' }, (args) => {
        return {
          contents: `
                        export { default } from "@svgurl:${args.path}";
                        export { default as ReactComponent } from "@svgr:${args.path}";
                    `,
          loader: 'jsx',
        };
      });
    },
  };

  return plugin;
}

export default createPlugin;
