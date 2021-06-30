/**
 * Based on https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/scripts/utils/verifyPackageTree.js
 * Customized for modular
 */

import * as chalk from 'chalk';
import * as fs from 'fs-extra';
import semver from 'semver';
import * as path from 'path';
import {
  Dependency,
  JSONSchemaForNPMPackageJsonFiles as PackageJson,
} from '@schemastore/package';

// We assume that having wrong versions of these
// in the tree will likely break your setup.
// This is a relatively low-effort way to find common issues.
export async function verifyPackageTree(): Promise<void> {
  const depsToCheck = [
    // These are packages most likely to break in practice.
    // See https://github.com/facebook/create-react-app/issues/1795 for reasons why.
    // I have not included Babel here because plugins typically don't import Babel (so it's not affected).
    'webpack',
    'webpack-dev-server',
  ];
  // Inlined from semver-regex, MIT license.
  // Don't want to make this a dependency after ejecting.
  const getSemverRegex = () =>
    /\bv?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?\b/gi;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ownPackageJson = require('modular-scripts/package.json') as PackageJson;
  const dependencies: Dependency = ownPackageJson.dependencies || {};
  const expectedVersionsByDep: Record<string, string> = {};
  // Gather wanted deps
  depsToCheck.forEach((dep) => {
    const expectedVersion = dependencies[dep];
    if (!expectedVersion) {
      console.log('HMM', dep, expectedVersion);
      throw new Error('This dependency list is outdated, fix it.');
    }
    if (!getSemverRegex().test(expectedVersion)) {
      throw new Error(
        `The ${dep} package should be pinned, instead got version ${expectedVersion}.`,
      );
    }
    expectedVersionsByDep[dep] = expectedVersion;
  });
  // Verify we don't have other versions up the tree
  let currentDir = path.dirname(
    require.resolve('modular-scripts/package.json'),
  );

  while (true) {
    const previousDir = currentDir;
    currentDir = path.resolve(currentDir, '..');
    if (currentDir === previousDir) {
      // We've reached the root.
      break;
    }
    const maybeNodeModules = path.resolve(currentDir, 'node_modules');
    if (!fs.existsSync(maybeNodeModules)) {
      continue;
    }

    for (const dep of depsToCheck) {
      const maybeDep = path.resolve(maybeNodeModules, dep);
      if (!fs.existsSync(maybeDep)) {
        return;
      }
      const maybeDepPackageJson = path.resolve(maybeDep, 'package.json');
      if (!fs.existsSync(maybeDepPackageJson)) {
        return;
      }
      const packageJsonString = await fs.readFile(maybeDepPackageJson, 'utf8');
      const depPackageJson = JSON.parse(packageJsonString) as PackageJson;
      const expectedVersion = expectedVersionsByDep[dep];
      if (
        !semver.satisfies(depPackageJson.version as string, expectedVersion)
      ) {
        console.error(
          chalk.red(
            `\nThere might be a problem with the project dependency tree.\n` +
              `It is likely ${chalk.bold(
                'not',
              )} a bug in modular-scripts, but something you need to fix locally.\n\n`,
          ) +
            `The ${chalk.bold(
              ownPackageJson.name,
            )} package provided by modular-scripts requires a dependency:\n\n` +
            chalk.green(
              `  "${chalk.bold(dep)}": "${chalk.bold(expectedVersion)}"\n\n`,
            ) +
            `Don't try to install it manually: your package manager does it automatically.\n` +
            `However, a different version of ${chalk.bold(
              dep,
            )} was detected higher up in the tree:\n\n` +
            `  ${chalk.bold(chalk.red(maybeDep))} (version: ${chalk.bold(
              chalk.red(depPackageJson.version),
            )}) \n\n` +
            `Manually installing incompatible versions is known to cause hard-to-debug issues.\n\n` +
            chalk.red(
              `If you would prefer to ignore this check, add ${chalk.bold(
                'SKIP_PREFLIGHT_CHECK=true',
              )} to an ${chalk.bold('.env')} file in your project.\n` +
                `That will permanently disable this message but you might encounter other issues.\n\n`,
            ) +
            `To ${chalk.green(
              'fix',
            )} the dependency tree, try following the steps below in the exact order:\n\n` +
            `  ${chalk.cyan('1.')} Delete ${chalk.bold(
              'yarn.lock',
            )} in your project folder.\n` +
            `  ${chalk.cyan('2.')} Delete ${chalk.bold(
              'node_modules',
            )} in your project folder.\n` +
            `  ${chalk.cyan('3.')} Remove "${chalk.bold(
              dep,
            )}" from ${chalk.bold('dependencies')} and/or ${chalk.bold(
              'devDependencies',
            )} in the ${chalk.bold(
              'package.json',
            )} file in your project folder.\n` +
            `  ${chalk.cyan('4.')} Run ${chalk.bold('yarn')}. \n\n` +
            `In most cases, this should be enough to fix the problem.\n` +
            `If this has not helped, there are a few other things you can try:\n\n` +
            `  ${chalk.cyan('5.')} Check if ${chalk.bold(
              maybeDep,
            )} is outside your project directory.\n` +
            `     For example, you might have accidentally installed something in your home folder.\n\n` +
            `  ${chalk.cyan('6.')} Try running ${chalk.bold(
              `npm ls ${dep}`,
            )} in your project folder.\n` +
            `     This will tell you which ${chalk.underline(
              'other',
            )} package (apart from the expected ${chalk.bold(
              ownPackageJson.name,
            )}) installed ${chalk.bold(dep)}.\n\n` +
            `If nothing else helps, add ${chalk.bold(
              'SKIP_PREFLIGHT_CHECK=true',
            )} to an ${chalk.bold('.env')} file in your project.\n` +
            `That would permanently disable this preflight check in case you want to proceed anyway.\n\n` +
            chalk.cyan(
              `P.S. We know this message is long but please read the steps above :-)\n`,
            ),
        );
        process.exit(1);
      }
    }
  }
}
