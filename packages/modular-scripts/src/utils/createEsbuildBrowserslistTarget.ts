import browserslist from 'browserslist';
import * as logger from './logger';

/** 123 or 123.456 or 123.456.789 */
const VersionSchema = /^(\d+\.\d+\.\d+|\d+\.\d+|\d+)$/;

// Taken from https://github.com/ben-eb/caniuse-lite/blob/v1.0.30001218/data/browsers.js
/** https://github.com/evanw/esbuild/blob/v0.11.15/internal/compat/js_table.go#L17-L35 */
const FAMILY_MAPPING: Record<string, string | undefined> = {
  chrome: 'chrome',
  edge: 'edge',
  es: 'es',
  firefox: 'firefox',
  ios_saf: 'ios',
  node: 'node',
  android: 'chrome',
  and_chr: 'chrome',
  and_ff: 'firefox',
  safari: 'safari',
};

export default function getTargets(dirName: string): string[] {
  const config = browserslist(browserslist.loadConfig({ path: dirName }));

  if (!config) {
    throw new Error(`Could not find config in ${dirName}`);
  }

  const targets = config
    .map((entry) => {
      const [rawBrowser, rawVersionOrRange] = entry.split(' ');

      const rawVersionNormalized = rawVersionOrRange
        // e.g. 13.4-13.7, take the lower range
        ?.replace(/-[\d.]+$/, '')
        // all => replace with 1
        ?.replace('all', '1');

      const versionResult = VersionSchema.exec(rawVersionNormalized);
      if (!versionResult) {
        logger.error(`Could not find esbuild equivalent for ${entry}`);
        return undefined;
      }

      const browserResult = FAMILY_MAPPING[rawBrowser];
      if (browserResult) {
        return { target: browserResult, version: rawVersionNormalized };
      } else {
        logger.error(`Could not find esbuild equivalent for ${rawBrowser}`);
        return undefined;
      }
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  if (targets.length === 0) {
    throw new Error('Could not resolve any esbuild targets');
  }

  return targets.map(({ target, version }) => `${target}${version}`);
}
