import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';

import * as logger from '../utils/logger';
import getModularRoot from '../utils/getModularRoot';

export async function check(): Promise<boolean> {
  let valid = true;

  const modularRoot = getModularRoot();

  const yarnRcPath = path.join(modularRoot, './.yarnrc.yml');

  try {
    const doc = yaml.load(await fs.readFile(yarnRcPath, 'utf8'), {
      onWarning: function (err) {
        console.log('YAML parsing error: ', err);
      },
      json: true, // JSON compat mode will overwrite dupe entries instead of throw an error.
      schema: yaml.FAILSAFE_SCHEMA,
    }) as Record<string, string>;
    valid = doc.nodeLinker === 'node-modules';
    if (doc.nodeLinker !== 'node-modules') {
      logger.error(
        '.yarnrc.yml file found where nodeLinker is not "node-modules"',
      );
      valid = false;
    } else {
      logger.debug(
        'Valid .yarnrc.yml file found with "nodeLinker: node-modules"',
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.debug(
        `Received error ${error.message} when trying to check .yarnrc.yml file`,
      );
    }
  }

  return valid;
}
