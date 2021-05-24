// Based on similar script in React
// https://github.com/facebook/react/blob/b87aabd/scripts/shared/listChangedFiles.js

'use strict';

const { execFileSync } = require('child_process');

function exec(command, args) {
  console.log('> ' + [command].concat(args).join(' '));
  const options = {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
    encoding: 'utf-8',
  };
  return execFileSync(command, args, options);
}

function execGitCmd(args) {
  return exec('git', args).trim().toString().split('\n');
}

function listChangedFiles() {
  const mergeBase = execGitCmd(['merge-base', 'HEAD', 'main']);
  return new Set([
    ...execGitCmd(['diff', '--name-only', '--diff-filter=ACMRTUB', mergeBase]),
    ...execGitCmd(['ls-files', '--others', '--exclude-standard']),
  ]);
}

module.exports = listChangedFiles;
