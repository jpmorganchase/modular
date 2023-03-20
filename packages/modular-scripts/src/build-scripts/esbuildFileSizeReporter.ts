import type * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import { sync as gzipSize } from 'gzip-size';
import * as path from 'path';
import recursive from 'recursive-readdir';

import getModularRoot from '../utils/getModularRoot';
import { Asset, canReadAsset } from './fileSizeReporter';

function removeFileNameHash(fileName: string): string {
  return fileName
    .replace(/\\/g, '/')
    .replace(
      /\/?(.*)(\.chunk)?(\.[0-9a-f]+)(\.js|\.css)/,
      (_match, p1: string, _p2, _p3, p4: string) => p1 + p4,
    );
}

export function esbuildMeasureFileSizesBeforeBuild(
  buildFolder: string,
): Promise<Record<string, number>> {
  const modularRoot = getModularRoot();

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

export function createEsbuildAssets(stats: esbuild.Metafile): Asset[] {
  const modularRoot = getModularRoot();

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
