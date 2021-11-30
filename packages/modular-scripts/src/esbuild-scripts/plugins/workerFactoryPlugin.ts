import * as esbuild from 'esbuild';
import * as path from 'path';
import getModularRoot from '../../utils/getModularRoot';

// This plugin builds Web Workers on the fly and exports them to use like worker-loader for Webpack 4: https://v4.webpack.js.org/loaders/worker-loader/
// The workers are not inlined, a new file is generated in the bundle. Only files *imported* with the *.worker pattern are matched.
// The workers are trampolined to avoid CORS errors.
// This will be deprecated in the future when esbuild supports the Worker signature: see https://github.com/evanw/esbuild/issues/312
// And will probably end up being compatible with Webpack 5 support https://webpack.js.org/guides/web-workers

function createPlugin(): esbuild.Plugin {
  const plugin: esbuild.Plugin = {
    name: 'worker-factory-plugin',
    setup(build) {
      // This stores built workers for later use
      const workerBuildCache: Map<string, esbuild.BuildResult> = new Map();

      build.onResolve(
        { filter: /worker-loader:.*\.worker.[jt]sx?$/ },
        (args) => {
          const importPath = args.path.split('worker-loader:')[1];
          const importAbsolutePath = path.join(args.resolveDir, importPath);

          // Pin the file extension to .js
          const workerAbsolutePath = path.join(
            path.dirname(importAbsolutePath),
            path.basename(importAbsolutePath).replace(/\.[jt]sx?$/, '.js'),
          );

          // Path passed to esbuild must be either absolute or fully relative.
          // If it's absolute, snapshots will fail because the built file will contain an absolute (different) path
          // We need to make it relative to the current working directory, and add './'
          // because esbuild doesn't like paths like 'packages/appName/src/...'
          const relativePath =
            './' + path.relative(process.cwd(), workerAbsolutePath);

          return {
            path: relativePath,
            namespace: 'web-worker',
          };
        },
      );

      build.onLoad({ filter: /.*/, namespace: 'web-worker' }, async (args) => {
        const relativePath = path.relative(getModularRoot(), args.path);

        // Build the worker file with the same format, target and definitions of the bundle
        try {
          const result = await esbuild.build({
            format: build.initialOptions.format,
            target: build.initialOptions.target,
            define: build.initialOptions.define,
            minify: build.initialOptions.minify,
            entryPoints: [args.path],
            plugins: [createExtensionAllowlistPlugin()],
            bundle: true,
            write: false,
          });

          // Store the file in the build cache for later use, since we need to emit a file and trampoline it transparently to the user
          workerBuildCache.set(relativePath, result);

          // Trampoline the worker within the bundle, to avoid CORS errors
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
        const result = workerBuildCache.get(args.path);
        if (result) {
          const { outputFiles } = result;
          if (outputFiles?.length === 1) {
            const outputFile = outputFiles[0];
            return {
              contents: outputFile.contents,
              loader: 'file',
            };
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

function createExtensionAllowlistPlugin(
  allowedExtensions = ['.js', '.jsx', '.ts', '.tsx'],
): esbuild.Plugin {
  return {
    name: 'worker-factory-plugin',
    setup(build) {
      // No lookbehind in Go regexp; need to look at all the files and do the check manually.
      build.onResolve({ filter: /.*/ }, (args) => {
        // Extract the extension; if not in the allow list, throw.
        const extension = path.extname(args.path);
        if (extension && !allowedExtensions.includes(extension)) {
          throw new Error(
            `Extension "${extension}" not allowed in web worker ${
              args.importer
            }. Permitted extensions are ${JSON.stringify(allowedExtensions)}`,
          );
        }
        return undefined;
      });
    },
  };
}

export default createPlugin;
