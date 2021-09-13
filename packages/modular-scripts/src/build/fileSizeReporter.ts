'use strict';

import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import filesize from 'filesize';
import recursive from 'recursive-readdir'
import stripAnsi from 'strip-ansi';
import { sync as gzipSize } from 'gzip-size';
import type { Stats } from 'webpack';
import * as logger from '../utils/logger';

interface WebpackStat {
  root: string;
  sizes: Record<string, number>
}

function canReadAsset(asset: string) {
  return (
    /\.(js|css)$/.test(asset) &&
    !/service-worker\.js/.test(asset) &&
    !/precache-manifest\.[0-9a-f]+\.js/.test(asset)
  );
}

// Prints a detailed summary of build files.
export function printFileSizesAfterBuild(
  webpackStats: Stats.ToJsonOutput,
  previousSizeMap: WebpackStat,
  buildFolder: string,
  maxBundleGzipSize: number,
  maxChunkGzipSize: number,
) {
  const root = previousSizeMap.root;
  const sizes = previousSizeMap.sizes;

  const assets = webpackStats.assets?.filter((asset: { name: string }) => canReadAsset(asset.name))
  .map((asset: { name: string }) => {
    const fileContents = fs.readFileSync(path.join(root, asset.name));
    const size = gzipSize(fileContents);
    const previousSize = sizes[removeFileNameHash(root, asset.name)];
    const difference = getDifferenceLabel(size, previousSize);
    return {
      folder: path.join(
        path.basename(buildFolder),
        path.dirname(asset.name),
      ),
      name: path.basename(asset.name),
      size: size,
      sizeLabel:
        filesize(size) + (difference ? ' (' + difference + ')' : ''),
    };
  }).sort((a, b) => b.size - a.size) || [];

  const longestSizeLabelLength = Math.max.apply(
    null,
    assets.map((a) => stripAnsi(a.sizeLabel).length),
  );
  
  let suggestBundleSplitting = false;
  assets.forEach((asset) => {
    let sizeLabel = asset.sizeLabel;
    let sizeLength = stripAnsi(sizeLabel).length;
    if (sizeLength < longestSizeLabelLength) {
      let rightPadding = ' '.repeat(longestSizeLabelLength - sizeLength);
      sizeLabel += rightPadding;
    }
    let isMainBundle = asset.name.indexOf('main.') === 0;
    let maxRecommendedSize = isMainBundle
      ? maxBundleGzipSize
      : maxChunkGzipSize;
    let isLarge = maxRecommendedSize && asset.size > maxRecommendedSize;
    if (isLarge && path.extname(asset.name) === '.js') {
      suggestBundleSplitting = true;
    }
    logger.log(
      '  ' +
        (isLarge ? chalk.yellow(sizeLabel) : sizeLabel) +
        '  ' +
        chalk.dim(asset.folder + path.sep) +
        chalk.cyan(asset.name),
    );
  });
  
  if (suggestBundleSplitting) {
    logger.log();
    logger.log(
      chalk.yellow('The bundle size is significantly larger than recommended.'),
    );
    logger.log(
      chalk.yellow(
        'Consider reducing it with code splitting: https://goo.gl/9VhYWB',
      ),
    );
    logger.log(
      chalk.yellow(
        'You can also analyze the project dependencies: https://goo.gl/LeUzfb',
      ),
    );
  }
}

function removeFileNameHash(buildFolder: string, fileName: string): string {
  return fileName
    .replace(buildFolder, '')
    .replace(/\\/g, '/')
    .replace(
      /\/?(.*)(\.[0-9a-f]+)(\.chunk)?(\.js|\.css)/,
      (match, p1, p2, p3, p4) => p1 + p4,
    );
}

// Input: 1024, 2048
// Output: "(+1 KB)"
function getDifferenceLabel(currentSize: number, previousSize: number) {
  let FIFTY_KILOBYTES = 1024 * 50;
  let difference = currentSize - previousSize;
  let fileSize = !Number.isNaN(difference) ? filesize(difference) : 0;
  if (difference >= FIFTY_KILOBYTES) {
    return chalk.red('+' + fileSize);
  } else if (difference < FIFTY_KILOBYTES && difference > 0) {
    return chalk.yellow('+' + fileSize);
  } else if (difference < 0) {
    return chalk.green(fileSize);
  } else {
    return '';
  }
}

export function measureFileSizesBeforeBuild(buildFolder: string): Promise<WebpackStat> {
  return new Promise<WebpackStat>((resolve) => {
    recursive(buildFolder, (err: Error, fileNames: string[]) => {
      let sizes: Record<string, number> = {};
      if (!err && fileNames) {
        sizes = fileNames.filter(canReadAsset).reduce<Record<string, number>>((memo, fileName) => {
          let contents = fs.readFileSync(fileName);
          let key = removeFileNameHash(buildFolder, fileName);
          memo[key] = gzipSize(contents);
          return memo;
        }, {});
      }
      resolve({
        root: buildFolder,
        sizes: sizes,
      });
    });
  });
}