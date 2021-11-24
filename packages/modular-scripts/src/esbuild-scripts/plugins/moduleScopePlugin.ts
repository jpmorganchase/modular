import chalk from 'chalk';
import * as esbuild from 'esbuild';
import * as path from 'path';
import getModularRoot from '../../utils/getModularRoot';
import type { Paths } from '../../utils/createPaths';

function createPlugin(paths: Paths): esbuild.Plugin {
  return {
    name: 'ModuleScopePlugin',
    setup(build) {
      const appSrc = paths.appSrc;
      const relativeAppSrc = path.relative(getModularRoot(), appSrc);
      build.onResolve({ filter: /.*/, namespace: 'file' }, (args) => {
        if (!args.importer) {
          return;
        }

        if (
          // If this resolves to a node_module, we don't care what happens next
          args.importer.indexOf('/node_modules/') !== -1 ||
          args.importer.indexOf('\\node_modules\\') !== -1
        ) {
          return;
        }
        const relative = path.relative(appSrc, args.importer);

        if (
          // If it's not in one of our app src or a subdirectory, not our request!
          relative.startsWith('../') ||
          relative.startsWith('..\\')
        ) {
          return;
        }

        const requestFullPath = path.resolve(
          path.dirname(args.importer),
          args.path,
        );
        // Find path from src to the requested file
        // Error if in a parent directory of all given appSrcs
        const requestRelative = path.relative(appSrc, requestFullPath);
        if (
          requestRelative.startsWith('../') ||
          requestRelative.startsWith('..\\')
        ) {
          return {
            errors: [
              {
                pluginName: 'ModuleScopePlugin',
                text: `You attempted to import ${chalk.cyan(
                  args.path,
                )} which falls outside of the project ${chalk.cyan(
                  relativeAppSrc,
                )} directory. 
Relative imports outside of ${chalk.cyan(relativeAppSrc)} are not supported.
You can either move it inside ${chalk.cyan(
                  relativeAppSrc,
                )}, or move it to another ${chalk.cyan('modular')} package.`,
              },
            ],
          };
        } else {
          return;
        }
      });
    },
  };
}

export default createPlugin;
