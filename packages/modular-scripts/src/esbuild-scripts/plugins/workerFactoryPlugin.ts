import * as esbuild from 'esbuild';
import { createRequire } from 'module';
import * as path from 'path';

import getModularRoot from '../../utils/getModularRoot';

/* This plugin builds workers on the fly and exports them like worker-loader for Webpack 4: https://v4.webpack.js.org/loaders/worker-loader/
   The workers are not inlined, a new file is generated in the bundle. Only files with the *.worker.* pattern are matched.
   This will be deprecated in the future when esbuild supports the Worker signature: see https://github.com/evanw/esbuild/issues/312
   And will probably end up being compatible with Webpack 5 support https://webpack.js.org/guides/web-workers */

function createPlugin(): esbuild.Plugin {
  const plugin: esbuild.Plugin = {
    name: 'worker-factory-plugin',
    setup(build) {
      const workerFactory: Map<string, esbuild.BuildResult> = new Map();

      build.onResolve({ filter: /.*\.worker$/ }, (args) => {
        const resolvedPath = createRequire(args.importer);
        return {
          path: resolvedPath.resolve(args.path),
          namespace: 'web-worker'
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'web-worker' }, async (args) => {
        console.log(args.path);
        const relativePath = path.relative(getModularRoot(), args.path);

        // Bundle as if it was a separate entry point, preserving directory structure.
        // TODO pass the same build params here.
        // TODO would it be possible to cache-break this with hashes?
        try {
          const result = await esbuild.build({
            entryPoints: [args.path],
            bundle: true,
            write: false,
            format: 'esm',
          }); 

          workerFactory.set(relativePath, result);

          return {
            contents: `
                  // Web worker bundled by worker-factory-plugin, mimicking the Worker constructor
                  import workerUrl from 'worker-url:${relativePath}';
                  
                  const workerPath = new URL(workerUrl, import.meta.url);
                  const importSrc = 'import "' + workerPath + '";';

                  const blob = new Blob([importSrc], {
                    type: "text/javascript",
                  });

                  export default class {
                    constructor() {
                      return new Worker(URL.createObjectURL(blob), { type: "module" });
                    }
                  }
                `,
          };
        } catch (e) {
          console.error('Error building worker script:', e);
        }
      });

      build.onResolve({ filter: /worker-url:.*/ }, (args) => {
        return {
          path: args.path.slice('worker-url:'.length),
          namespace: 'worker-url',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'worker-url' }, (args) => {
        const result = workerFactory.get(args.path);
        if (result) {
          const { outputFiles } = result;
          if (outputFiles?.length === 1) {
            const outputFile = outputFiles[0];
            return {
              contents: outputFile.contents,
              loader: 'file'
            }
          } else {
            throw new Error(`Could not read output files`);
          }
        } else {
          throw new Error(`Could not find result for ${args.path}`);
        }
      });
    },
  };

  return plugin;
}

export default createPlugin;
