import recursive from 'recursive-readdir';
import path from 'path';
import * as fs from 'fs-extra';
import { sync as gzipSize } from 'gzip-size';

import type { ModularBuildConfig, ModularBuildContext } from '../types';
import { canReadAsset, removeFileNameHash } from '../utils';
import type { WorkflowPlugin } from '../workflow';

export const FILE_SIZES = Symbol('FILE_SIZES');

export function esbuildMeasureFileSizes<T extends ModularBuildContext>(
  config: ModularBuildConfig,
): WorkflowPlugin<T>[] {
  return [
    {
      phase: 'validate',
      async handler(context: T) {
        return {
          ...context,
          [FILE_SIZES]: await measureBeforeBuild(
            config.targetPaths.appBuild,
            config.modularRoot,
          ),
        };
      },
    },
    {
      phase: 'cleanup',
      handler(context: T) {
        console.log('measureFileSizes(cleanup)');

        return context;
      },
    },
  ];
}

function measureBeforeBuild(
  buildFolder: string,
  modularRoot: string,
): Promise<Record<string, number>> {
  return new Promise<Record<string, number>>((resolve) => {
    recursive(buildFolder, (err: Error, fileNames: string[]) => {
      if (err) {
        resolve({});
      } else {
        resolve(
          fileNames
            .filter(canReadAsset)
            .reduce<Record<string, number>>((memo, absoluteFilePath) => {
              const filePath = path.relative(modularRoot, absoluteFilePath);

              const contents = fs.readFileSync(absoluteFilePath);

              const folder = path.dirname(filePath);
              const name = path.basename(filePath);

              const key = `${folder}/${removeFileNameHash(name)}`;

              memo[key] = gzipSize(contents);

              return memo;
            }, {}),
        );
      }
    });
  });
}

// export function createEsbuildAssets(
//   paths: Paths,
//   stats: esbuild.Metafile,
// ): Asset[] {
//   const modularRoot = getModularRoot();
//
//   const readableAssets = Object.keys(stats.outputs).filter(canReadAsset);
//
//   return readableAssets
//     .map<Asset>((filePath) => {
//       const fileContents = fs.readFileSync(path.join(modularRoot, filePath));
//       const size = gzipSize(fileContents);
//       const folder = path.dirname(filePath);
//
//       const name = path.basename(filePath);
//       return {
//         folder,
//         name,
//         normalizedName: `${folder}/${removeFileNameHash(name)}`,
//         size: size,
//       };
//     })
//     .sort((a, b) => b.size - a.size);
// }
//
