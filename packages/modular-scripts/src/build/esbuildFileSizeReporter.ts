import type * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import { sync as gzipSize } from 'gzip-size';
import * as path from 'path';
import recursive from 'recursive-readdir';

import type { Paths } from '../utils/createPaths';
import { Asset, canReadAsset } from './fileSizeReporter';
import { StandAloneBuilderContext } from './createBuilderContext';

function removeFileNameHash(fileName: string): string {
  return fileName
    .replace(/\\/g, '/')
    .replace(
      /\/?(.*)(\.chunk)?(\.[0-9a-f]+)(\.js|\.css)/,
      (match, p1, p2, p3, p4) => p1 + p4,
    );
}

export async function esbuildMeasureFileSizesBeforeBuild(
  context: StandAloneBuilderContext,
): Promise<void> {
  const modularRoot = context.modularRoot;

  context.previousFileSizes = await new Promise<Record<string, number>>(
    (resolve) => {
      recursive(context.paths.appBuild, (err: Error, fileNames: string[]) => {
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
    },
  );
}

export function createEsbuildAssets(
  paths: Paths,
  stats: esbuild.Metafile,
  modularRoot: string,
): Asset[] {
  const readableAssets = Object.keys(stats.outputs).filter(canReadAsset);

  return readableAssets
    .map<Asset>((filePath) => {
      const fileContents = fs.readFileSync(path.join(modularRoot, filePath));
      const size = gzipSize(fileContents);
      const folder = path.dirname(filePath);

      const name = path.basename(filePath);
      return {
        folder,
        name,
        normalizedName: `${folder}/${removeFileNameHash(name)}`,
        size: size,
      };
    })
    .sort((a, b) => b.size - a.size);
}
