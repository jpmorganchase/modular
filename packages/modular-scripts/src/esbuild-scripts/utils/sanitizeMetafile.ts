import * as path from 'path';
import type * as esbuild from 'esbuild';

import getModularRoot from '../../utils/getModularRoot';
import type { Paths } from '../../utils/createPaths';

export const sanitizeFileName = (pathName: string): string => {
  if (['.css', '.css.map'].includes(path.extname(pathName))) {
    return pathName.replace('/js/', '/css/');
  } else {
    return pathName;
  }
};

function sanitizeMetafile(
  paths: Paths,
  result: esbuild.Metafile,
): esbuild.Metafile {
  // make sure that we mark the index-[hash].css file as an entrypoint
  const outputs = Object.fromEntries(
    Object.entries(result.outputs).map(([key, value]) => {
      if (path.extname(key) === '.css') {
        if (path.basename(key).startsWith('index')) {
          value.entryPoint = path.relative(getModularRoot(), paths.appIndexJs);
        }
      }

      return [sanitizeFileName(key), value];
    }),
  );

  const metafile: esbuild.Metafile = {
    ...result,
    outputs,
  };

  return metafile;
}

export default sanitizeMetafile;
