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
  fix: boolean;
  target?: string;
}

interface Verification {
  check(target?: string): Promise<boolean>;
  fix?(): Promise<void>;
}

export async function check({ fix = false, target }: Check): Promise<void> {
  let failed = false;

  for (const checkName of CHECKS) {
    logger.debug('');
    logger.debug(`===== Running ${checkName} =====`);
    const checkCls = (await import(`./${checkName}`)) as Verification;

    if (fix && checkCls.fix) {
      await checkCls.fix();
    }

    // if the check returns false then we fail and show the error.
    if (await checkCls.check(target || process.cwd())) {
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
