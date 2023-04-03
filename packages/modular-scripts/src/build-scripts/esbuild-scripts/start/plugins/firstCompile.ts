import type { Plugin, BuildResult } from 'esbuild';

type ResolveCallback = () => void;
type ResultCallback = (result: BuildResult) => void;

function createPlugin(
  firstCompileCallback: ResolveCallback,
  rebuildCallback: ResultCallback,
): Plugin {
  const plugin: Plugin = {
    name: 'first-compile-reporter',
    setup(build) {
      let isFirstCompile = true;

      build.onEnd((result) => {
        rebuildCallback(result);
        if (isFirstCompile) {
          isFirstCompile = false;
          firstCompileCallback();
        }
      });
    },
  };

  return plugin;
}

export default createPlugin;
