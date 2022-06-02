import * as logger from '../utils/logger';

const CHECKS = [
  'verifyBrowserslist',
  'verifyModularRootPackageJson',
  'verifyPackageTree',
  'verifyWorkspaceDependencies',
  'verifyWorkspaceStructure',
  'verifyYarnRcYml',
];

interface Check {
  check(this: void): Promise<boolean>;
  fix?(this: void): Promise<void>;
}

export async function check(fix = false): Promise<void> {
  let failed = false;

  for (const checkName of CHECKS) {
    logger.debug('');
    logger.debug(`===== Running ${checkName} =====`);
    const checkCls = (await import(`./${checkName}`)) as Check;

    if (fix && checkCls.fix) {
      await checkCls.fix();
    }

    // if the check returns false then we fail and show the error.
    if (await checkCls.check()) {
      continue;
    } else {
      failed = true;
    }
    logger.debug(`===== Finished ${checkName} =====`);
    logger.debug('');
  }

  if (failed) {
    throw new Error(`The above errors were found during modular check`);
  }
}
