import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import execa from 'execa';
import * as fs from 'fs-extra';
import path from 'path';
import prompts from 'prompts';

import fetch from './fetch';

function isYarnInstalled(): boolean {
  try {
    execa.sync('yarnpkg', ['-v']);
    return true;
  } catch (err) {
    return false;
  }
}

interface NPMRegistryListing {
  'dist-tags': Record<string, string>;
}

async function preflight(): Promise<void> {
  if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
    const { stdout: registry } = await execa('yarnpkg', [
      'config',
      'get',
      'registry',
    ]);

    const url = String(new URL('/modular-scripts', registry));

    const res = await fetch(url);
    const modularScriptsRegistry = (await res.json()) as NPMRegistryListing;
    const newVersion = modularScriptsRegistry['dist-tags']['latest'];

    const { version: v } = fs.readJSONSync(
      path.join(__dirname, '..', 'package.json'),
    ) as PackageJson;
    const version = v as string;
    if (newVersion != version) {
      const update = await prompts({
        type: 'confirm',
        name: 'value',
        message: `Your version of modular is ${version} . Would you like to update to ${newVersion}?`,
        initial: true,
      });

      if (update.value) {
        await execa('yarnpkg', ['upgrade', 'modular-scripts']);
      }
    }
  }

  if (isYarnInstalled() === false) {
    throw new Error(
      'Please install `yarn` before attempting to run `modular-scripts`.',
    );
  }
}

export default preflight;
