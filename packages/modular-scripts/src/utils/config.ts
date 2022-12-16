import { cosmiconfigSync } from 'cosmiconfig';
import path from 'path';
import getModularRoot from './getModularRoot';

// Where cosmiconfig can look for the configuration
const searchPlaces = [
  '.modular.js',
  'package.json',
  `.modularrc`,
  `.modularrc.json`,
  `.modularrc.yaml`,
  `.modularrc.yml`,
  `.modularrc.js`,
  `.modularrc.cjs`,
  `modular.config.js`,
  `modular.config.cjs`,
];

// Look for configuration file
const modularRoot = getModularRoot();
const explorer = cosmiconfigSync('modular', { searchPlaces });
const configResult = explorer.search(path.join(modularRoot, 'package.json'));

/**
 * Configuration file interface
 */
interface Config {
  useModularEsbuild: boolean | null;
  externalCdnTemplate: string | null;
  externalBlockList: string[] | null;
  externalAllowList: string[] | null;
  publicUrl: string | null;
  generateSourceMap: boolean | null;
}

type ConfigDefs = {
  [Key in keyof Config]: {
    default: Exclude<Config[Key], null>;
    override: undefined | Exclude<Config[Key], null>;
  };
};

/**
 * Defaults and env variable overrides
 */
const defs: ConfigDefs = {
  useModularEsbuild: {
    default: false,
    override:
      process.env.USE_MODULAR_ESBUILD === 'true' ||
      process.env.USE_MODULAR_ESBUILD === 'false'
        ? process.env.USE_MODULAR_ESBUILD === 'true'
        : undefined,
  },
  externalCdnTemplate: {
    default: 'https://esm.sh/[name]@[version]',
    override: process.env.EXTERNAL_CDN_TEMPLATE,
  },
  externalBlockList: {
    default: [],
    override: process.env.EXTERNAL_BLOCK_LIST
      ? process.env.EXTERNAL_BLOCK_LIST.split(',')
      : undefined,
  },
  externalAllowList: {
    default: ['**'],
    override: process.env.EXTERNAL_ALLOW_LIST
      ? process.env.EXTERNAL_ALLOW_LIST.split(',')
      : undefined,
  },
  publicUrl: {
    default: '',
    override: process.env.PUBLIC_URL,
  },
  generateSourceMap: {
    default: true,
    override:
      process.env.GENERATE_SOURCEMAP === 'true' ||
      process.env.GENERATE_SOURCEMAP === 'false'
        ? process.env.GENERATE_SOURCEMAP === 'true'
        : undefined,
  },
};

/**
 * Get the configured value for a given configuration field.
 * @param configEntry Field containing the configuration variable to read
 * @returns configured value:
 * - the override environment variable if configured
 * - the value stated in the config file if provided
 * - the default value if neither environment variable nor the config file are provided
 */
export function getConfig<T extends keyof ConfigDefs>(
  key: T,
): Exclude<Config[T], null> {
  let configValue;
  if (configResult) {
    const loadedConfig = configResult.config as Config;
    if (typeof loadedConfig[key] === typeof defs[key].default) {
      configValue = loadedConfig[key] as Exclude<Config[T], null>;
    }
  }
  return defs[key].override ?? configValue ?? defs[key].default;
}
