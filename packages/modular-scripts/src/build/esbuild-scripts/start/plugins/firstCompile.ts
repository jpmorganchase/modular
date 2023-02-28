import { Plugin } from 'esbuild';

type ResolveCalback = () => void;

function createPlugin(callback: ResolveCalback): Plugin {
  const plugin: Plugin = {
    name: 'first-compile-reporter',
    setup(build) {
      let isFirstCompile = true;

      build.onEnd(() => {
        if (isFirstCompile) {
          isFirstCompile = false;
          callback();
        }
      });
    },
  };

  return plugin;
}

export default createPlugin;
