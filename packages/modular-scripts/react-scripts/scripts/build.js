'use strict';

const isCi = require('is-ci');

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', (err) => {
  throw err;
});

const chalk = require('chalk');
const fs = require('fs-extra');
const webpack = require('webpack');
const configFactory = require('../config/webpack.config');
const paths = require('../config/paths');
const formatWebpackMessages = require('../../react-dev-utils/formatWebpackMessages');
const printBuildError = require('../../react-dev-utils/printBuildError');

const compiler = webpack(configFactory('production'));

compiler.run(async (err, stats) => {
  console.log(chalk.grey('[modular] ') + 'Webpack Compiled.');
  let messages;
  let statsJson;
  if (err) {
    if (!err.message) {
      printBuildError(err);
      process.exit(1);
    }

    let errMessage = err.message;

    // Add additional information for postcss errors
    if (Object.prototype.hasOwnProperty.call(err, 'postcssNode')) {
      errMessage +=
        'CompileError: Begins at CSS selector ' + err['postcssNode'].selector;
    }

    messages = formatWebpackMessages({
      errors: [errMessage],
      warnings: [],
    });
  } else {
    statsJson = stats.toJson({
      all: false,
      assets: true,
      warnings: true,
      errors: true,
    });
    messages = formatWebpackMessages({
      errors: statsJson.errors,
      warnings: statsJson.warnings,
    });
  }

  if (messages.errors.length) {
    // Only keep the first error. Others are often indicative
    // of the same problem, but confuse the reader with noise.
    printBuildError(new Error(messages.errors[0]));
    process.exit(1);
  }

  if (isCi && messages.warnings.length) {
    console.log(
      chalk.yellow(
        'Treating warnings as errors because process.env.CI = true.\n' +
          'Most CI servers set it automatically.\n',
      ),
    );
    printBuildError(new Error(messages.warnings.join('\n\n')));
    process.exit(1);
  }

  try {
    await fs.writeJson(paths.appBuild + '/bundle-stats.json', statsJson);
    process.exit(0);
  } catch (error) {
    printBuildError(error);
    process.exit(1);
  }
});
