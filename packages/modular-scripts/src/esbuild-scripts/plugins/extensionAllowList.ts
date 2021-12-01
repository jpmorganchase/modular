import * as esbuild from 'esbuild';
import * as path from 'path';

// This plugin resolves all the files in the project and excepts if one of the extensions is not in the allow list
// Please note that implicit (empty) extensions in the importer are always valid.

function createExtensionAllowlistPlugin(
  allowedExtensions = ['.js', '.jsx', '.ts', '.tsx'],
): esbuild.Plugin {
  return {
    name: 'worker-factory-plugin',
    setup(build) {
      // No lookbehind in Go regexp; need to look at all the files and do the check manually.
      build.onLoad({ filter: /.*/ }, (args) => {
        // Extract the extension; if not in the allow list, throw.
        const extension = path.extname(args.path);
        if (!allowedExtensions.includes(extension)) {
          throw new Error(
            `Extension for file "${
              args.path
            }" not allowed. Permitted extensions are ${JSON.stringify(
              allowedExtensions,
            )}`,
          );
        }
        return undefined;
      });
    },
  };
}

export default createExtensionAllowlistPlugin;
