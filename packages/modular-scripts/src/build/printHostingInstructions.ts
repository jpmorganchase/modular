import type { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';

import chalk from 'chalk';
import * as fs from 'fs';
import globalModules from 'global-modules';

import * as logger from '../utils/logger';

function printHostingInstructions(
  appPackage: PackageJson,
  publicUrl: string,
  publicPath: string,
  buildFolder: string,
): void {
  if (publicUrl && publicUrl.includes('.github.io/')) {
    // "homepage": "http://user.github.io/project"
    const publicPathname = new URL(publicPath).pathname;
    const hasDeployScript =
      typeof appPackage.scripts !== 'undefined' &&
      typeof appPackage.scripts.deploy !== 'undefined';
    printBaseMessage(buildFolder, publicPathname);

    printDeployInstructions(publicUrl, hasDeployScript);
  } else if (publicPath !== '/') {
    // "homepage": "http://mywebsite.com/project"
    printBaseMessage(buildFolder, publicPath);
  } else {
    // "homepage": "http://mywebsite.com"
    //   or no homepage
    printBaseMessage(buildFolder, publicUrl);

    printStaticServerInstructions(buildFolder);
  }
  logger.log();
  logger.log('Find out more about deployment here:');
  logger.log();
  logger.log(`  ${chalk.yellow('https://cra.link/deployment')}`);
  logger.log();
}

function printBaseMessage(buildFolder: string, hostingLocation: string) {
  logger.log(
    `The project was built assuming it is hosted at ${chalk.green(
      hostingLocation || 'the server root',
    )}.`,
  );
  logger.log(
    `You can control this with the ${chalk.green(
      'homepage',
    )} field in your ${chalk.cyan('package.json')}.`,
  );

  if (!hostingLocation) {
    logger.log('For example, add this to build it for GitHub Pages:');
    logger.log();

    logger.log(
      `  ${chalk.green('"homepage"')} ${chalk.cyan(':')} ${chalk.green(
        '"http://myname.github.io/myapp"',
      )}${chalk.cyan(',')}`,
    );
  }
  logger.log();
  logger.log(`The ${chalk.cyan(buildFolder)} folder is ready to be deployed.`);
}

function printDeployInstructions(publicUrl: string, hasDeployScript: boolean) {
  logger.log(`To publish it at ${chalk.green(publicUrl)} , run:`);
  logger.log();

  // If script deploy has been added to package.json, skip the instructions
  if (!hasDeployScript) {
    logger.log(`  ${chalk.cyan('yarn')} add --dev gh-pages`);
    logger.log();

    logger.log(
      `Add the following script in your ${chalk.cyan('package.json')}.`,
    );
    logger.log();

    logger.log(`    ${chalk.dim('// ...')}`);
    logger.log(`    ${chalk.yellow('"scripts"')}: {`);
    logger.log(`      ${chalk.dim('// ...')}`);
    logger.log(
      `      ${chalk.yellow('"predeploy"')}: ${chalk.yellow(`yarn build",`)}`,
    );
    logger.log(
      `      ${chalk.yellow('"deploy"')}: ${chalk.yellow(
        '"gh-pages -d build"',
      )}`,
    );
    logger.log('    }');
    logger.log();

    logger.log('Then run:');
    logger.log();
  }
  logger.log(`  ${chalk.cyan('yarn')} run deploy`);
}

function printStaticServerInstructions(buildFolder: string) {
  logger.log('You may serve it with a static server:');
  logger.log();

  if (!fs.existsSync(`${globalModules}/serve`)) {
    logger.log(`  ${chalk.cyan('yarn')} global add serve`);
  }
  logger.log(`  ${chalk.cyan('serve')} -s ${buildFolder}`);
}

export default printHostingInstructions;
