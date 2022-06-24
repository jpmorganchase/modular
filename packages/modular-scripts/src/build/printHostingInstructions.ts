import chalk from 'chalk';

import * as logger from '../utils/logger';
import { StandAloneBuilderContext } from './createBuilderContext';

export function printHostingInstructions(
  context: StandAloneBuilderContext,
): void {
  const {
    targetDirectory,
    paths: { publicUrlOrPath, appBuild },
  } = context;

  if (publicUrlOrPath && publicUrlOrPath.includes('.github.io/')) {
    // "homepage": "http://user.github.io/project"
    const publicPathname = new URL(publicUrlOrPath).pathname;
    printBaseMessage(appBuild, publicPathname);
  } else if (publicUrlOrPath !== '/') {
    // "homepage": "http://mywebsite.com/project"
    printBaseMessage(appBuild, publicUrlOrPath);
  } else {
    // "homepage": "http://mywebsite.com"
    //   or no homepage
    printBaseMessage(appBuild, publicUrlOrPath);

    printStaticServerInstructions(targetDirectory);
  }
  logger.log();
  logger.log('Find out more about deployment here:');
  logger.log();
  logger.log(`  ${chalk.yellow('https://cra.link/deployment')}`);
  logger.log();
}

function printBaseMessage(appBuild: string, hostingLocation: string) {
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
  logger.log(`The ${chalk.cyan(appBuild)} folder is ready to be deployed.`);
}

function printStaticServerInstructions(target: string) {
  logger.log('You may serve it with a static server:');
  logger.log();

  logger.log(`  ${chalk.cyan('modular serve')} ${target}`);
}
