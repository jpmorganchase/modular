#!/usr/bin/env node

import * as path from 'path';

import meow from 'meow';

import { checkESMDependencies } from '.';
import type { Dependencies, PackageJson, Result } from '.';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
// See https://github.com/facebook/create-react-app/blob/f36d61a/packages/react-scripts/bin/react-scripts.js#L11-L16
process.on('unhandledRejection', (err) => {
  throw err;
});

const cli = meow(`
  Usage
    $ npx esm-dependency-checker [project path (default: \`process.cwd()\`)]

  Examples
    $ npx esm-dependency-checker
    $ npx esm-dependency-checker path/to/package
`);

const cwd = path.resolve(cli.input[0] ?? process.cwd());

function excludeKnownDevDependencies(dependencies: Dependencies) {
  const dependenciesWithExclusions = {
    ...dependencies,
  };

  [
    'react-scripts',
    '@testing-library/jest-dom',
    '@testing-library/react',
    '@testing-library/user-event',
  ].forEach((exclusion) => {
    delete dependenciesWithExclusions[exclusion];
  });

  return dependenciesWithExclusions;
}

function printResults(results: Result[]) {
  const esmPackages: string[] = [];
  const nonESMPackages: string[] = [];

  results.forEach((result) => {
    const nameAndVersion = `${result.name}@${result.version}`;
    if (result.isESM) {
      esmPackages.push(nameAndVersion);
    } else {
      nonESMPackages.push(`${nameAndVersion}: ${result.reason as string}`);
    }
  });

  console.info(`${esmPackages.length}/${results.length} ESM packages:`);
  console.info(esmPackages);

  console.info(`${nonESMPackages.length}/${results.length} non-ESM packages:`);
  console.info(nonESMPackages);
}

void (async () => {
  const pkgJson = require(path.join(cwd, 'package.json')) as PackageJson;
  const dependencies = {
    ...pkgJson.dependencies,
    ...pkgJson.peerDependencies,
  };

  const dependenciesWithExclusions = excludeKnownDevDependencies(dependencies);

  printResults(await checkESMDependencies(dependenciesWithExclusions, { cwd }));
})();
