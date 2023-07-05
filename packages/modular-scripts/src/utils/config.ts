import path from 'path';
import { cosmiconfigSync } from 'cosmiconfig';
import getModularRoot from './getModularRoot';
import * as logger from './logger';
const modularRoot = getModularRoot();

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

/**
 * Configuration file interface
 */
interface Config {
  useModularEsbuild: boolean;
  externalCdnTemplate: string;
  externalBlockList: string[];
  externalAllowList: string[];
  publicUrl: string;
  generateSourceMap: boolean;
  swcJest: boolean;
}

type ConfigDefs = {
  [Key in keyof Config]: {
    default: Config[Key];
    override: undefined | Config[Key];
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
  swcJest: {
    default: false,
    override:
      process.env.SWC_JEST === 'true' || process.env.SWC_JEST === 'false'
        ? process.env.SWC_JEST === 'true'
        : undefined,
  },
};

const explorer = cosmiconfigSync('modular', { searchPlaces });
const configurations: Map<string, null | { config: Partial<Config> }> =
  new Map();

/**
 * Searches for configuration files in a given workspace,
 * first checks if there's an already loaded & cached configuration, otherwise
 * runs a cosmiconfig search and saves it for future use
 * @param workspacePath Location to search
 * @returns cosmiconfig configuration, if any found
 */
function searchConfig(
  workspacePath: string,
): null | { config: Partial<Config> } {
  const cachedConfig = configurations.get(workspacePath);
  if (cachedConfig !== undefined) {
    return cachedConfig;
  } else {
    const config = explorer.search(path.join(workspacePath, 'package.json'));
    configurations.set(workspacePath, config);
    return config;
  }
}

/**
 * Get the configured value in a workspace for a given configuration field.
 * @param field Field containing the configuration variable to read
 * @param workspacePath Path of workspace to which configuration applies
 * @returns configured value:
 * - the override environment variable if configured
 * - the value stated in the package's config file if provided
 * - the value stated in the root config file if provided
 * - the default value if neither environment variable nor the config file are provided
 */
export function getConfig<T extends keyof Config>(
  field: T,
  workspacePath: string,
): Config[T] {
  const configResult = searchConfig(workspacePath);
  const configValue = configResult ? configResult.config[field] : undefined;
  const rootConfigResult = searchConfig(modularRoot);
  const rootConfigValue = rootConfigResult
    ? rootConfigResult.config[field]
    : undefined;
  const returnConfigValue =
    defs[field].override ??
    configValue ??
    rootConfigValue ??
    defs[field].default;
  if (defs[field].override !== undefined) {
    logger.debug(
      `${field} configured to ${JSON.stringify(
        returnConfigValue,
      )} by the environment variable provided`,
    );
  } else if (configValue !== undefined) {
    logger.debug(
      `${field} configured to ${JSON.stringify(
        returnConfigValue,
      )} through package's modular configuration at ${workspacePath}`,
    );
  } else if (rootConfigValue !== undefined) {
    logger.debug(
      `${field} configured to ${JSON.stringify(
        returnConfigValue,
      )} through the project's root modular configuration`,
    );
  } else {
    logger.debug(
      `Using default configuration for ${field}: ${JSON.stringify(
        returnConfigValue,
      )}`,
    );
  }
  return returnConfigValue;
}
