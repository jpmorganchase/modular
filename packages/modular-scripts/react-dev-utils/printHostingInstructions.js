'use strict';

const chalk = require('chalk');
const url = require('url');
const globalModules = require('global-modules');
const fs = require('fs');

function printHostingInstructions(
  appPackage,
  publicUrl,
  publicPath,
  buildFolder,
) {
  if (publicUrl && publicUrl.includes('.github.io/')) {
    // "homepage": "http://user.github.io/project"
    const publicPathname = url.parse(publicPath).pathname;
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
  console.log();
  console.log('Find out more about deployment here:');
  console.log();
  console.log(`  ${chalk.yellow('https://cra.link/deployment')}`);
  console.log();
}

function printBaseMessage(buildFolder, hostingLocation) {
  console.log(
    `The project was built assuming it is hosted at ${chalk.green(
      hostingLocation || 'the server root',
    )}.`,
  );
  console.log(
    `You can control this with the ${chalk.green(
      'homepage',
    )} field in your ${chalk.cyan('package.json')}.`,
  );

  if (!hostingLocation) {
    console.log('For example, add this to build it for GitHub Pages:');
    console.log();

    console.log(
      `  ${chalk.green('"homepage"')} ${chalk.cyan(':')} ${chalk.green(
        '"http://myname.github.io/myapp"',
      )}${chalk.cyan(',')}`,
    );
  }
  console.log();
  console.log(`The ${chalk.cyan(buildFolder)} folder is ready to be deployed.`);
}

function printDeployInstructions(publicUrl, hasDeployScript) {
  console.log(`To publish it at ${chalk.green(publicUrl)} , run:`);
  console.log();

  // If script deploy has been added to package.json, skip the instructions
  if (!hasDeployScript) {
    console.log(`  ${chalk.cyan('yarn')} add --dev gh-pages`);
    console.log();

    console.log(
      `Add the following script in your ${chalk.cyan('package.json')}.`,
    );
    console.log();

    console.log(`    ${chalk.dim('// ...')}`);
    console.log(`    ${chalk.yellow('"scripts"')}: {`);
    console.log(`      ${chalk.dim('// ...')}`);
    console.log(
      `      ${chalk.yellow('"predeploy"')}: ${chalk.yellow(`"yarn build",`)}`,
    );
    console.log(
      `      ${chalk.yellow('"deploy"')}: ${chalk.yellow(
        '"gh-pages -d build"',
      )}`,
    );
    console.log('    }');
    console.log();

    console.log('Then run:');
    console.log();
  }
  console.log(`  ${chalk.cyan('yarn')} run deploy`);
}

function printStaticServerInstructions(buildFolder) {
  console.log('You may serve it with a static server:');
  console.log();

  if (!fs.existsSync(`${globalModules}/serve`)) {
    console.log(`  ${chalk.cyan('yarn')} global add serve`);
  }
  console.log(`  ${chalk.cyan('serve')} -s ${buildFolder}`);
}

module.exports = printHostingInstructions;
