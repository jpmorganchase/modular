#!/usr/bin/env node

import createModularApp from './cli';
import commander from 'commander';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
// See https://github.com/facebook/create-react-app/blob/f36d61a/packages/react-scripts/bin/react-scripts.js#L11-L16
process.on('unhandledRejection', (err) => {
  throw err;
});
interface Options {
  repo: boolean;
  preferOffline: boolean;
}

const program = new commander.Command('create-modular-react-app');
program.arguments('<name>');
program.option('--repo [value]', 'Should a repository be initialized', false);
program.option('--prefer-offline', 'Yarn --prefer-offline', true);
program.action(async (name: string, options: Options) => {
  await createModularApp({
    name,
    preferOffline: options.preferOffline,
    repo: options.repo,
  });
});

try {
  void program.parseAsync(process.argv.slice(2));
} catch (err) {
  console.error(err);
}
