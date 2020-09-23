// Based on similar script in React
// https://github.com/facebook/react/blob/6d375f3/scripts/eslint/index.js
//
// The main difference is React uses the Node.js API of ESLint,
// whereas this script uses the ESLint CLI to ensure CLI flags are respected
// and to avoid issues such as https://github.com/facebook/react/pull/19040:
//
// > Ideally all the eslint options should be passable.

'use strict';

const execa = require('execa');
const isCI = require('is-ci');
const micromatch = require('micromatch');
const { CLIEngine } = require('eslint');
const listChangedFiles = require('./listChangedFiles');

const allPaths = ['*.{js,ts,tsx}'];

let changedFiles = null;

function runESLintOnFilePatterns(filePatterns, onlyChanged) {
  if (onlyChanged && changedFiles === null) {
    // Calculate lazily.
    changedFiles = [...listChangedFiles()];
  }
  const finalFilePatterns = onlyChanged
    ? intersect(changedFiles, filePatterns)
    : '.';

  const result = execa.sync(
    'eslint',
    [...process.argv.slice(2), ...finalFilePatterns],
    {
      preferLocal: true,
      reject: false,
      stdio: 'inherit',
    },
  );

  // https://github.com/facebook/create-react-app/blob/71facad/packages/react-scripts/bin/react-scripts.js#L35-L48
  if (result.signal) {
    if (result.signal === 'SIGKILL') {
      console.log(
        'Lint failed because the process exited too early. ' +
          'This probably means the system ran out of memory or someone called ' +
          '`kill -9` on the process.',
      );
    } else if (result.signal === 'SIGTERM') {
      console.log(
        'Lint failed because the process exited too early. ' +
          'Someone might have called `kill` or `killall`, or the system could ' +
          'be shutting down.',
      );
    }
    process.exit(1);
  }

  if (result.exitCode === 0) {
    console.log('Lint passed.');
  } else {
    console.log('Lint failed.');
  }

  process.exit(result.exitCode);
}

function intersect(files, patterns) {
  let intersection = [];
  patterns.forEach((pattern) => {
    intersection = [
      ...intersection,
      ...micromatch.match(files, pattern, { matchBase: true }),
    ];
  });
  // https://github.com/okonet/lint-staged#how-can-i-ignore-files-from-eslintignore-
  const cli = new CLIEngine();
  return [...new Set(intersection)].filter((file) => !cli.isPathIgnored(file));
}

function runESLint({ onlyChanged }) {
  if (typeof onlyChanged !== 'boolean') {
    throw new Error('Pass options.onlyChanged as a boolean.');
  }
  if (!onlyChanged && !isCI) {
    console.log('Hint: run `yarn linc` to only lint changed files.');
  }
  console.log(`Linting ${onlyChanged ? 'changed' : 'all'} files...`);

  runESLintOnFilePatterns(allPaths, onlyChanged);
}

module.exports = runESLint;
