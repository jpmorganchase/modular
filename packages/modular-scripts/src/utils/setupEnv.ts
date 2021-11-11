import * as fs from 'fs-extra';
import * as path from 'path';
import { config as loadConfig } from 'dotenv';
import dotenvExpand from 'dotenv-expand';

import { findModularRoot } from './getModularRoot';

export async function setupEnvForDirectory(dirName: string): Promise<void> {
  const resolveRelative = (relativePath: string) =>
    path.resolve(dirName, relativePath);
  const dotenv = resolveRelative('.env');

  // https://github.com/bkeepers/dotenv#what-other-env-files-can-i-use
  const dotenvFiles = [
    `${dotenv}.${process.env.NODE_ENV}.local`,
    // Don't include `.env.local` for `test` environment
    // since normally you expect tests to produce the same
    // results for everyone
    // @ts-ignore
    (process.env.NODE_ENV !== 'test' && `${dotenv}.local`) || '',
    `${dotenv}.${process.env.NODE_ENV}`,
    dotenv,
  ].filter(Boolean);

  // Load environment variables from .env* files. Suppress warnings using silent
  // if this file is missing. dotenv will never modify any environment variables
  // that have already been set.  Variable expansion is supported in .env files.
  // https://github.com/motdotla/dotenv
  // https://github.com/motdotla/dotenv-expand
  await Promise.all(
    dotenvFiles.map(async (dotenvFile: string) => {
      if (await fs.pathExists(dotenvFile)) {
        dotenvExpand(
          loadConfig({
            path: dotenvFile,
          }),
        );
      }
    }),
  );
}

export default async function setupEnv(
  env: typeof process.env.NODE_ENV,
): Promise<void> {
  const modularRoot = findModularRoot();

  // setup verbose Logging
  // @ts-ignore
  process.env.MODULAR_LOGGER_DEBUG =
    process.env.MODULAR_LOGGER_DEBUG || process.argv.includes('--verbose');

  if (!modularRoot) {
    return;
  }

  // We support resolving modules according to `NODE_PATH`.
  // This lets you use absolute paths in imports inside large monorepos:
  // https://github.com/facebook/create-react-app/issues/253.
  // It works similar to `NODE_PATH` in Node itself:
  // https://nodejs.org/api/modules.html#modules_loading_from_the_global_folders
  // Note that unlike in Node, only *relative* paths from `NODE_PATH` are honored.
  // Otherwise, we risk importing Node.js core modules into an app instead of webpack shims.
  // https://github.com/facebook/create-react-app/issues/1023#issuecomment-265344421
  // We also resolve them to make sure all tools using them work consistently.
  process.env.NODE_PATH = (process.env.NODE_PATH || '')
    .split(path.delimiter)
    .filter((folder) => folder && !path.isAbsolute(folder))
    .map((folder) => path.resolve(modularRoot, folder))
    .join(path.delimiter);

  // @ts-ignore
  process.env.NODE_ENV = env;
  process.env.BABEL_ENV = env;

  // in the case that NODE_ENV is test then we actually will assume for browserslist
  // that we're running production builds
  // @ts-ignore
  process.env.BROWSERSLIST_ENV =
    process.env.BROWSERSLIST_ENV ||
    (process.env.NODE_ENV === 'test' ? 'production' : process.env.NODE_ENV);

  await setupEnvForDirectory(modularRoot);
}
