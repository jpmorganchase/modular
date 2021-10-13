import * as logger from '../utils/logger';

const CHECKS = [
  'verifyBrowserslist',
  'verifyPackageTree',
  'verifyPrivateModularRoot',
  'verifyWorkspaceDependencies',
  'verifyWorkspaceStructure',
];

interface Check {
  default(this: void): Promise<boolean>;
}

export async function check(): Promise<void> {
  let failed = false;

  for (const checkName of CHECKS) {
    logger.debug('');
    logger.debug(`===== Running ${checkName} =====`);
    try {
      const { default: verifyCheck } = (await import(
        `./${checkName}`
      )) as Check;

      // if the check returns false then we fail and show the error.
      if (!(await verifyCheck())) {
        failed = true;
      }
    } catch (e) {
      logger.error(String(e));
      failed = false;
    }
    logger.debug(`===== Finished ${checkName} =====`);
    logger.debug('');
  }

  if (failed) {
    throw new Error(`The above errors were found during modular check`);
  }
}
