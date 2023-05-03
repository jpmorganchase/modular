import * as path from 'path';
import * as fs from 'fs-extra';
import { sync as gzipSize } from 'gzip-size';
import recursive from 'recursive-readdir';
import { StatsCompilation } from 'webpack-dev-server';
import { Asset, canReadAsset } from './fileSizeReporter';
import type { Paths } from './common-scripts/determineTargetPaths';

function removeFileNameHash(fileName: string): string {
  return fileName.replace(/\\/g, '/').replace(
    /\/?(.*)(\.[0-9a-f]+)(\.chunk)?(\.js|\.css)/,
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-return
    (_match, p1, _p2, _p3, p4) => p1 + p4,
  );
}

export function webpackMeasureFileSizesBeforeBuild(
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
              const contents = fs.readFileSync(fileName);
              const key = removeFileNameHash(
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

export function createWebpackAssets(
  paths: Paths,
  stats: StatsCompilation,
): Asset[] {
  const readableAssets: string[] = (
    stats.assets?.filter((asset: { name: string }) =>
      canReadAsset(asset.name),
    ) || []
  ).map((asset: { name: string }) => asset.name);
  return readableAssets
    .map<Asset>((name) => {
      const fileContents = fs.readFileSync(path.join(paths.appBuild, name));
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
