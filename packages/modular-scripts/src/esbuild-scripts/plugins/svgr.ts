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
        const pathName = path.join(
          args.resolveDir,
          args.path.slice('@svgr:'.length),
        );
        return {
          path: pathName,
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

      build.onLoad({ filter: /\.svg$/, namespace: 'file' }, (args) => {
        const resolveDir = path.dirname(args.path);
        const relativePath = path.relative(resolveDir, args.path);
        return {
          resolveDir,
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
