import * as path from 'path';
import chalk from 'chalk';
import filesize from 'filesize';
import stripAnsi from 'strip-ansi';
import * as logger from '../utils/logger';
import { StandAloneBuilderContext } from './createBuilderContext';

export interface Asset {
  folder: string;
  name: string;
  size: number;
  normalizedName: string;
}

interface LabelledAsset extends Asset {
  sizeLabel: string;
  differenceLabel: string;
}

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024;
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024;

// Input: 1024, 2048
// Output: "(+1 KB)"
const FIFTY_KILOBYTES = 1024 * 50;

// Prints a detailed summary of build files.
export function printFileSizesAfterBuild(context: StandAloneBuilderContext) {
  const { assets, previousFileSizes } = context;
  const sizedAssets = assets
    .sort((a, b) => b.size - a.size)
    .map<LabelledAsset>((asset) => {
      const previousSize = previousFileSizes[asset.normalizedName];
      const differenceLabel = getDifferenceLabel(asset.size, previousSize);
      return {
        ...asset,
        sizeLabel: filesize(asset.size),
        differenceLabel,
      };
    });

  const longestSizeLabelLength = Math.max.apply(
    null,
    sizedAssets.map((a) => stripAnsi(a.sizeLabel).length),
  );

  const longestDifferenceLabelLength = Math.max.apply(
    null,
    sizedAssets.map((a) => stripAnsi(a.differenceLabel).length),
  );

  let suggestBundleSplitting = false;

  logger.log('File sizes after gzip:');
  logger.log();
  sizedAssets.forEach((asset) => {
    let sizeLabel = asset.sizeLabel;
    const sizeLength = stripAnsi(sizeLabel).length;
    if (sizeLength < longestSizeLabelLength) {
      const rightPadding = ' '.repeat(longestSizeLabelLength - sizeLength);
      sizeLabel += rightPadding;
    }

    let differenceLabel = asset.differenceLabel;
    const differenceLength = stripAnsi(differenceLabel).length;
    if (differenceLength < longestDifferenceLabelLength) {
      const rightPadding = ' '.repeat(
        longestDifferenceLabelLength - differenceLength,
      );
      differenceLabel += rightPadding;
    }

    const isMainBundle = asset.name.indexOf('main.') === 0;
    const maxRecommendedSize = isMainBundle
      ? WARN_AFTER_BUNDLE_GZIP_SIZE
      : WARN_AFTER_CHUNK_GZIP_SIZE;

    const isLarge = maxRecommendedSize && asset.size > maxRecommendedSize;

    logger.log(
      '  ' +
        (isLarge ? chalk.yellow(sizeLabel) : sizeLabel) +
        '  ' +
        differenceLabel +
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

function getDifferenceLabel(
  currentSize: number,
  previousSize: number | undefined,
) {
  if (previousSize) {
    const difference = currentSize - previousSize;
    const fileSize = !Number.isNaN(difference) ? filesize(difference) : 0;
    if (difference >= FIFTY_KILOBYTES) {
      return chalk.red('(+' + fileSize + ')');
    } else if (difference < FIFTY_KILOBYTES && difference > 0) {
      return chalk.yellow('(+' + fileSize + ')');
    } else if (difference < 0) {
      return chalk.green('(-' + fileSize + ')');
    } else {
      return chalk.dim.grey('(unchanged)');
    }
  } else {
    return chalk.dim.green('(new)');
  }
}

export function canReadAsset(asset: string) {
  return (
    /\.(js|css)$/.test(asset) &&
    !/service-worker\.js/.test(asset) &&
    !/precache-manifest\.[0-9a-f]+\.js/.test(asset)
  );
}
