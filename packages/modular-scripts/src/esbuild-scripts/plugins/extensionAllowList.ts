import * as esbuild from 'esbuild';
import * as path from 'path';

// This plugin resolves all the files in the project and excepts if one of the extensions is not in the allow list
// Please note that implicit (empty) extensions in the importer are always valid.

interface ExtensionPluginConf {
  allowedExtensions?: string[];
  reason?: string;
}
type PluginData = Pick<esbuild.OnResolveArgs, 'importer'>;

function createExtensionAllowlistPlugin({
  reason,
  allowedExtensions = ['.js', '.jsx', '.ts', '.tsx'],
}: ExtensionPluginConf): esbuild.Plugin {
  return {
    name: 'extension-allow-list-plugin',
    setup(build) {
      // No lookbehind in Go regexp; need to look at all the files and do the check manually.
      build.onResolve({ filter: /.*/ }, (args) => {
        // Extract the extension; if not in the allow list, throw.
        const extension = path.extname(args.path);
        if (extension && !allowedExtensions.includes(extension)) {
          return {
            namespace: 'extension-not-allowed-error',
            pluginData: { importer: args.importer },
            path: args.path,
          };
        }
        return undefined;
      });

      build.onLoad(
        { filter: /.*/, namespace: 'extension-not-allowed-error' },
        (args) => {
          const pluginData = args.pluginData as PluginData;
          const errorReason = reason ? ` Reason: ${reason}` : '';
          throw new Error(
            `Extension for file "${args.path}", imported by "${
              pluginData.importer
            }" not allowed. Permitted extensions are ${JSON.stringify(
              allowedExtensions,
            )}.${errorReason}`,
          );
        },
      );
    },
  };
}

export default createExtensionAllowlistPlugin;
