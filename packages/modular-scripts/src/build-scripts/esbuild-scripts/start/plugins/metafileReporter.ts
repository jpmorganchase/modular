import { Plugin } from 'esbuild';
import type * as esbuild from 'esbuild';

type MetafileCallback = (metafile: esbuild.Metafile) => void;

function createPlugin(callback: MetafileCallback): Plugin {
  const plugin: Plugin = {
    name: 'incremental-errors',
    setup(build) {
      build.onEnd((result) => {
        callback(result.metafile as esbuild.Metafile);
      });
    },
  };

  return plugin;
}

export default createPlugin;
