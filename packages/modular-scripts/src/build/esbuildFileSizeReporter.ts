import type * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import { sync as gzipSize } from 'gzip-size';
import * as path from 'path';
import recursive from 'recursive-readdir';

import { Paths } from '../utils/createPaths';
import { Asset, canReadAsset } from './fileSizeReporter';

function removeFileNameHash(fileName: string): string {
  return fileName
    .replace(/\\/g, '/')
    .replace(
      /\/?(.*)(\.chunk)?(\.[0-9a-f]+)(\.js|\.css)/,
      (match, p1, p2, p3, p4) => p1 + p4,
    );
}

export function esbuildMeasureFileSizesBeforeBuild(
  buildFolder: string,
): Promise<Record<string, number>> {
  return new Promise<Record<string, number>>((resolve) => {
    recursive(buildFolder, (err: Error, fileNames: string[]) => {
      if (err) {
        resolve({});
      } else {
        resolve(
          fileNames
            .filter(canReadAsset)
            .reduce<Record<string, number>>((memo, fileName) => {
              let contents = fs.readFileSync(fileName);
              let key = removeFileNameHash(
                path.relative(buildFolder, fileName),
              );
              memo[key] = gzipSize(contents);
              return memo;
            }, {}),
        );
      }
    });
  });
}

export function createEsbuildAssets(
  paths: Paths,
  stats: esbuild.Metafile,
): Asset[] {
  const readableAssets = Object.keys(stats.outputs)
    .map((name) => {
      return path.join(paths.appPath, name);
    })
    .filter(canReadAsset);

  return readableAssets
    .map<Asset>((name) => {
      const fileContents = fs.readFileSync(name);
      const size = gzipSize(fileContents);
      return {
        folder: path.join(path.basename(paths.appBuild), path.dirname(name)),
        name: path.basename(name),
        normalizedName: removeFileNameHash(name),
        size: size,
      };
    })
    .sort((a, b) => b.size - a.size);
}
