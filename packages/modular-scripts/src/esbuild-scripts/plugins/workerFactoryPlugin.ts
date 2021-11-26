import * as esbuild from 'esbuild';
import type { Paths } from '../../utils/createPaths';
import path from 'path';

/* This plugin builds workers on the fly and exports them like worker-loader for Webpack 4: https://v4.webpack.js.org/loaders/worker-loader/
   The workers are not inlined, a new file is generated in the bundle. Only files with the *.worker.* pattern are matched.
   This will be deprecated in the future when esbuild supports the Worker signature: see https://github.com/evanw/esbuild/issues/312
   And will probably end up being compatible with Webpack 5 support https://webpack.js.org/guides/web-workers */

type WorkerLoadArgs = Pick<esbuild.OnResolveArgs, 'importer'>;

function createPlugin(paths: Paths, targetPath: string): esbuild.Plugin {
  const plugin: esbuild.Plugin = {
    name: 'worker-factory-plugin',
    setup(build) {
      build.onResolve({ filter: /\.worker\./ }, (args) => {
        return {
          path: args.path,
          namespace: 'web-worker',
          pluginData: { importer: args.importer },
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'web-worker' }, async (args) => {
        const imported = args.path;
        const { importer } = args.pluginData as WorkerLoadArgs;
        const importerPath = path.dirname(importer);
        const importedPath = path.dirname(imported);
        const relativeImporterDir = path.relative(paths.appSrc, importerPath);
        const workerPath = path.join(importerPath, imported);
        const outFileName = path.basename(workerPath).replace(/\.ts$/, '.js');

        const outFilePath = path.join(
          targetPath,
          relativeImporterDir,
          importedPath,
          outFileName,
        );

        console.log({
          importer,
          imported,
          importerPath,
          importedPath,
          relativeImporterDir,
          workerPath,
          outFileName,
          outFilePath,
          targetPath,
        });

        // Bundle as if it was a separate entry point, preserving directory structure.
        // TODO pass the same build params here.
        // TODO would it be possible to cache-break this with hashes?
        try {
          await esbuild.build({
            entryPoints: [workerPath],
            outfile: outFilePath,
            bundle: true,
          });
          return {
            contents: `
                  // Web worker bundled by worker-factory-plugin, mimicking the Worker constructor
                  export default class {
                    constructor() {
                      return new Worker('${imported}');
                    }
                  }
                `,
          };
        } catch (e) {
          console.error('Error building worker script:', e);
        }
      });
    },
  };

  return plugin;
}

export default createPlugin;
