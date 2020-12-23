'use strict';

// If you need to modify this, talk to us! Maybe your change
// is good enough for everybody, or we have alternate workarounds.

const path = require('path');
const { getLoader, loaderByName } = require('@craco/craco');
const glob = require('glob');

if (!process.env.MODULAR_ROOT) {
  throw new Error(
    // this should never be visible to a user, only us when we're developing
    'MODULAR_ROOT not found in environment, did you forget to pass it when calling cracoBin in cli.ts?',
  );
}
const modularRoot = process.env.MODULAR_ROOT;
const absolutePackagesPath = path.resolve(modularRoot, 'packages');
const absoluteModularGlobalConfigsPath = path.resolve(modularRoot, 'modular');

module.exports = {
  webpack: {
    configure(webpackConfig) {
      const { isFound, match } = getLoader(
        webpackConfig,
        loaderByName('babel-loader'),
      );

      if (isFound) {
        const include = Array.isArray(match.loader.include)
          ? match.loader.include
          : [match.loader.include];
        match.loader.include = [...include, absolutePackagesPath];
      }

      return webpackConfig;
    },
  },
  jest: {
    configure(jestConfig) {
      const perPackageSetupTests = glob.sync(
        `${absolutePackagesPath}/*/src/setupTests.{js,ts,tsx}`,
        { cwd: process.cwd() },
      );
      if (perPackageSetupTests.length) {
        console.warn(
          "A setupTests file was found within an app's `src/` directory:",
          perPackageSetupTests.join(', '),
        );
        console.warn(
          'Modular projects should store all test setup at the root of the project (e.g. `modular/setupTests.{js,ts,tsx}`).',
        );
      }

      return {
        ...jestConfig,
        rootDir: absolutePackagesPath,
        roots: ['<rootDir>'],
        testMatch: ['<rootDir>/*/src/**/*.{spec,test}.{js,ts,tsx}'],
        coverageDirectory: path.resolve(modularRoot, 'coverage'),
        collectCoverageFrom: ['<rootDir>/*/src/**/*.{js,ts,tsx}', '!**/*.d.ts'],
        setupFiles: jestConfig.setupFiles
          .concat([path.join(__dirname, './jest-setupEnvironment.js')])
          .concat(
            glob.sync(
              `${absoluteModularGlobalConfigsPath}/setupEnvironment.{js,ts,tsx}`,
              {
                cwd: process.cwd(),
              },
            ),
          ),
        setupFilesAfterEnv: glob.sync(
          `${absoluteModularGlobalConfigsPath}/setupTests.{js,ts,tsx}`,
          {
            cwd: process.cwd(),
          },
        ),
      };
    },
  },
};
