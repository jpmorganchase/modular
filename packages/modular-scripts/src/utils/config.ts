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
interface ConfigObject {
  useModularEsbuild: boolean | null;
  externalCdnTemplate: string | null;
  externalBlockList: string[] | null;
  externalAllowList: string[] | null;
  https: boolean | null;
  host: string | null;
}

/**
 * Defaults and env variable overrides
 */
const config = {
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
  https: {
    default: false,
    override:
      process.env.HTTPS === 'true' || process.env.HTTPS === 'false'
        ? process.env.HTTPS === 'true'
        : undefined,
  },
  host: {
    default: '0.0.0.0',
    override: process.env.HOST,
  },
};

type ConfigObjectKey = keyof typeof config;

/**
 * Get the configured value for a given configuration field.
 * @param configEntry Field containing the configuration variable to read
 * @returns configured value:
 * - the override environment variable if configured
 * - the value stated in the config file if provided
 * - the default value if neither environment variable nor the config file are provided
 *
 * Although return type can be many things, we can use 'as' with confidence to restrict it to the type we're querying:
 *
 * - 'useModularEsbuild' will always be a boolean, so we can do getConfig('useModularEsbuild') as boolean
 */
export function getConfig(
  configEntry: ConfigObjectKey,
): string | boolean | string[] {
  const overrideValue = config[configEntry].override;
  const defaultValue = config[configEntry].default;
  if (overrideValue !== undefined) {
    return overrideValue;
  } else if (configResult) {
    // Error if configuration doesn't match our interface?
    const loadedConfig = configResult.config as ConfigObject;
    const configValue = loadedConfig[configEntry];
    if (configValue !== null && typeof configValue === typeof defaultValue) {
      return configValue;
    }
  }
  return defaultValue;
}
