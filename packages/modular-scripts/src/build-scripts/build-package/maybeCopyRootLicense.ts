import * as path from 'path';
import * as fs from 'fs-extra';
import globby from 'globby';
import getPrefixedLogger from '../../utils/getPrefixedLogger';
import getModularRoot from '../../utils/getModularRoot';

const licenseGlob = 'LICEN@(C|S)E*';

export function maybeCopyRootLicense(
  target: string,
  targetOutputDirectory: string,
) {
  const logger = getPrefixedLogger(target);
  const modularRoot = getModularRoot();
  const matches = globby.sync(path.join(targetOutputDirectory, licenseGlob), {
    cwd: modularRoot,
    onlyFiles: true,
  });
  if (matches.length === 0) {
    logger.debug(
      `No license found in ${targetOutputDirectory}. Looking for root license.`,
    );
    const rootLicenses = globby.sync(path.join(modularRoot, licenseGlob), {
      cwd: modularRoot,
      onlyFiles: true,
    });
    if (rootLicenses.length > 0) {
      rootLicenses.forEach((license) => {
        const filename = path.basename(license);
        logger.log(`Copying ${filename} found in ${modularRoot}`);
        fs.copyFileSync(license, path.join(targetOutputDirectory, filename));
      });
    }
  }
}
