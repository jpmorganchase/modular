import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import resolve from 'resolve';
import { readJsonSync } from 'fs-extra';
import type { Paths } from '../../common-scripts/determineTargetPaths';

export interface Modules {
  additionalModulePaths: string | string[] | null;
  webpackAliases:
    | Record<string, never>
    | {
        src: string;
      }
    | undefined;
  hasTsConfig: boolean;
}

interface Config {
  compilerOptions?: { baseUrl?: string };
}

/**
 * Get additional module paths based on the baseUrl of a compilerOptions object.
 *
 * @param {Object} options
 */
function getAdditionalModulePaths(
  options: { baseUrl?: string } = {},
  paths: Paths,
) {
  const baseUrl = options.baseUrl;

  if (!baseUrl) {
    return '';
  }

  const baseUrlResolved = path.resolve(paths.appPath, baseUrl);

  // We don't need to do anything if `baseUrl` is set to `node_modules`. This is
  // the default behavior.
  if (path.relative(paths.appNodeModules, baseUrlResolved) === '') {
    return null;
  }

  // Allow the user set the `baseUrl` to `appSrc`.
  if (path.relative(paths.appSrc, baseUrlResolved) === '') {
    return [paths.appSrc];
  }

  // If the path is equal to the root directory we ignore it here.
  // We don't want to allow importing from the root directly as source files are
  // not transpiled outside of `src`. We do allow importing them with the
  // absolute path (e.g. `src/Components/Button.js`) but we set that up with
  // an alias.
  if (path.relative(paths.appPath, baseUrlResolved) === '') {
    return null;
  }

  // Otherwise, throw an error.
  throw new Error(
    chalk.red.bold(
      "Your project's `baseUrl` can only be set to `src` or `node_modules`." +
        ' Create React App does not support other values at this time.',
    ),
  );
}

/**
 * Get webpack aliases based on the baseUrl of a compilerOptions object.
 *
 * @param {*} options
 */
function getWebpackAliases(
  options: { baseUrl?: string },
  paths: Paths,
): Record<string, never> | { src: string } | undefined {
  const baseUrl = options.baseUrl;

  if (!baseUrl) return {};

  const baseUrlResolved = path.resolve(paths.appPath, baseUrl);

  if (path.relative(paths.appPath, baseUrlResolved) === '') {
    return {
      src: paths.appSrc,
    };
  }
}

export default async function getModules(paths: Paths): Promise<Modules> {
  // Check if TypeScript is setup
  const hasTsConfig = fs.existsSync(paths.appTsConfig);
  const hasJsConfig = fs.existsSync(paths.appJsConfig);

  if (hasTsConfig && hasJsConfig) {
    throw new Error(
      'You have both a tsconfig.json and a jsconfig.json. If you are using TypeScript please remove your jsconfig.json file.',
    );
  }

  let config: Config = {};

  // If there's a tsconfig.json we assume it's a
  // TypeScript project and set up the config
  // based on tsconfig.json
  if (hasTsConfig) {
    const ts = (await import(
      resolve.sync('typescript', {
        basedir: paths.appNodeModules,
      })
    )) as {
      readConfigFile: (path: string, readFile: unknown) => { config: Config };
      sys: { readFile: unknown };
    };
    config = ts.readConfigFile(paths.appTsConfig, ts.sys.readFile).config;
    // Otherwise we'll check if there is jsconfig.json
    // for non TS projects.
  } else if (hasJsConfig) {
    config = readJsonSync(require.resolve(paths.appJsConfig)) as Config;
  }

  const options: { baseUrl?: string } = config.compilerOptions || {};

  const additionalModulePaths = getAdditionalModulePaths(options, paths);

  return {
    additionalModulePaths: additionalModulePaths,
    webpackAliases: getWebpackAliases(options, paths),
    hasTsConfig,
  };
}

export interface Modules {
  additionalModulePaths: string | string[] | null;
  webpackAliases:
    | Record<string, never>
    | {
        src: string;
      }
    | undefined;
  hasTsConfig: boolean;
}

interface Config {
  compilerOptions?: { baseUrl?: string };
}
