import * as path from 'path';
import chalk from 'chalk';
import filesize from 'filesize';
import stripAnsi from 'strip-ansi';
import * as logger from '../utils/logger';

export interface Asset {
  folder: string;
  name: string;
  size: number;
  normalizedName: string;
}

interface LabelledAsset extends Asset {
  sizeLabel: string;
}

// Prints a detailed summary of build files.
export function printFileSizesAfterBuild(
  assets: Asset[],
  previousSizeMap: Record<string, number>,
  maxBundleGzipSize: number,
  maxChunkGzipSize: number,
) {
  const sizedAssets = assets
    .sort((a, b) => b.size - a.size)
    .map<LabelledAsset>((asset) => {
      const size = asset.size;
      const previousSize = previousSizeMap[asset.normalizedName];
      const difference = getDifferenceLabel(size, previousSize);
      return {
        ...asset,
        sizeLabel: `${filesize(size)} ${difference}`,
      };
    });

  const longestSizeLabelLength = Math.max.apply(
    null,
    sizedAssets.map((a) => stripAnsi(a.sizeLabel).length),
  );

  let suggestBundleSplitting = false;

  logger.log('File sizes after gzip:');
  logger.log();
  sizedAssets.forEach((asset) => {
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
  logger.log();

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

// Input: 1024, 2048
// Output: "(+1 KB)"
function getDifferenceLabel(currentSize: number, previousSize: number) {
  let FIFTY_KILOBYTES = 1024 * 50;
  let difference = currentSize - previousSize;
  let fileSize = !Number.isNaN(difference) ? filesize(difference) : 0;
  if (difference >= FIFTY_KILOBYTES) {
    return chalk.red('(+' + fileSize + ')');
  } else if (difference < FIFTY_KILOBYTES && difference > 0) {
    return chalk.yellow('(+' + fileSize + ')');
  } else if (difference < 0) {
    return chalk.green('(-' + fileSize + ')');
  } else {
    return chalk.dim.grey('(unchanged)');
  }
}

export function canReadAsset(asset: string) {
  return (
    /\.(js|css)$/.test(asset) &&
    !/service-worker\.js/.test(asset) &&
    !/precache-manifest\.[0-9a-f]+\.js/.test(asset)
  );
}
