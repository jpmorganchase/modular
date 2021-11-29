import * as esbuild from 'esbuild';
import path from 'path';

/* This plugin builds workers on the fly and exports them like worker-loader for Webpack 4: https://v4.webpack.js.org/loaders/worker-loader/
   The workers are not inlined, a new file is generated in the bundle. Only files with the *.worker.* pattern are matched.
   This will be deprecated in the future when esbuild supports the Worker signature: see https://github.com/evanw/esbuild/issues/312
   And will probably end up being compatible with Webpack 5 support https://webpack.js.org/guides/web-workers */

type WorkerLoadArgs = Pick<esbuild.OnResolveArgs, 'importer'>;

function createPlugin(): esbuild.Plugin {
  const plugin: esbuild.Plugin = {
    name: 'worker-factory-plugin',
    setup(build) {
      build.onResolve({ filter: /\.worker\.(js|ts|tsx)$/ }, (args) => {
        return {
          path: args.path.replace(/\.ts/, '.js'),
          namespace: 'web-worker',
          pluginData: { importer: args.importer },
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'web-worker' }, async (args) => {
        const imported = args.path;
        const { importer } = args.pluginData as WorkerLoadArgs;
        const importerPath = path.dirname(importer);
        const workerPath = path.join(importerPath, imported);

        let buildResult: esbuild.BuildResult;
        try {
          buildResult = await esbuild.build({
            format: build.initialOptions.format,
            target: build.initialOptions.target,
            define: build.initialOptions.define,
            entryPoints: [workerPath],
            write: false,
            bundle: true,
          });
          const builtSrc = buildResult.outputFiles?.[0].text as string;
          return {
            contents: builtSrc,
            loader: 'file',
            namespace: 'post-build-web-worker',
          };
        } catch (e) {
          console.error('Error building worker script:', e);
        }
      });

      build.onResolve(
        { filter: /.*/, namespace: 'post-build-web-worker' },
        (args) => {
          console.log('I am executed for', args);
          return undefined;
        },
      );
    },
  };

  return plugin;
}

export default createPlugin;
