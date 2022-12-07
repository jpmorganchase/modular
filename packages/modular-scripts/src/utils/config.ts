import { cosmiconfig } from 'cosmiconfig';
import path from 'path';
import getModularRoot from './getModularRoot';
import * as logger from './logger';

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
const explorer = cosmiconfig('modular', { searchPlaces });
const configuration = explorer.search(path.join(modularRoot, 'package.json'));

// Interface with all configurations
interface ConfigObject {
  useModularEsbuild: boolean;
}

type ConfigObjectKey = keyof ConfigObject;

/**
 * Get the configured value for a given configuration field.
 * Rejects if no configuration file is present or the queired field is not present.
 * @param configEntry Field containing the configuration variable to read
 * @returns Value of configuration field queried if present
 */
export async function getConfiguration(
  configEntry: ConfigObjectKey,
): Promise<boolean> {
  const loadedConfiguration = await configuration;
  // Handle no or empty configuration - debug log? don't think we should error should we?
  if (loadedConfiguration) {
    // Error if configuration doesn't match our interface?
    const config = loadedConfiguration.config as ConfigObject;
    const value = config[configEntry];
    if (value) {
      return value;
    } else {
      throw new Error(
        `No field ${configEntry.toString()} found in configuration file`,
      );
    }
  } else {
    throw new Error(
      `Couldn't identify and load a valid modular configuration file`,
    );
  }
}

/**
 * Reads env variables and configuration to understand if esbuild or Webpack should be used
 * Webpack is used as default if no configuration is set or both are set to true
 * Environment variables take precedence over config file
 * @returns True if esbuild should be used or false if webpack should be used
 */
export async function utilizeEsbuild(): Promise<boolean> {
  if (
    process.env.USE_MODULAR_WEBPACK === 'true' ||
    process.env.USE_MODULAR_ESBUILD === 'false'
  ) {
    return false;
  }
  if (
    process.env.USE_MODULAR_ESBUILD === 'true' ||
    process.env.USE_MODULAR_WEBPACK === 'false'
  ) {
    return true;
  } else {
    return await getConfiguration('useModularEsbuild')
      .then((result) => {
        return result;
      })
      // Debug logging the errors as it's reasonable for users not to have provided a configuration,
      // but it's useful to know while trying to figure out what's going wrong
      .catch((err: Error) => {
        logger.debug(err.message);
        return false;
      });
  }
}
