// We run jest by ourselves instead of using CRA's test runner because it assumes
// that we're running from the context of an app, wherewas we're running the context
// of a monorepo. Owning the runner then gives us the opportunity to generate
// coverage reports correctly across workspaces, etc.
'use strict';

const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const fs = require('fs-extra');

const moduleFileExtensions = [
  'web.mjs',
  'mjs',
  'web.js',
  'js',
  'web.ts',
  'ts',
  'web.tsx',
  'tsx',
  'json',
  'web.jsx',
  'jsx',
];

if (!process.env.MODULAR_ROOT) {
  throw new Error(
    // this should never be visible to a user, only us when we're developing
    'MODULAR_ROOT not found in environment, did you forget to pass it when calling cracoBin in cli.ts?',
  );
}
const modularRoot = process.env.MODULAR_ROOT;
const absolutePackagesPath = path.resolve(modularRoot, 'packages');
const absoluteModularGlobalConfigsPath = path.resolve(modularRoot, 'modular');

const config = {
  rootDir: absolutePackagesPath,
  roots: ['<rootDir>'],
  testMatch: ['<rootDir>/**/src/**/*.{spec,test}.{js,ts,tsx}'],
  coverageDirectory: path.resolve(modularRoot, 'coverage'),
  collectCoverageFrom: ['<rootDir>/**/src/**/*.{js,ts,tsx}', '!**/*.d.ts'],
  setupFiles: [require.resolve('react-app-polyfill/jsdom')]
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

  testEnvironment: 'jsdom',
  testRunner: require.resolve('jest-circus/runner'),
  transform: {
    '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$': ['esbuild-jest', { sourcemap: true }],
    '^.+\\.css$': path.join(__dirname, './cssTransform.js'),
    '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)': path.join(
      __dirname,
      './fileTransform.js',
    ),
    // TODO - ?raw, ?url, ?worker, ?worker&inline
    // '^.+\\?url$': path.join(__dirname, './fileTransform.js'),
  },

  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  moduleNameMapper: {
    '^react-native$': 'react-native-web',
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
  },
  moduleFileExtensions: [...moduleFileExtensions, 'node'].filter(
    (ext) => !ext.includes('mjs'),
  ),
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  resetMocks: false,
};

const overrides = {
  ...fs.readJSONSync(path.join(modularRoot, 'package.json')).jest,
};

const supportedKeys = [
  'clearMocks',
  'collectCoverageFrom',
  'coveragePathIgnorePatterns',
  'coverageReporters',
  'coverageThreshold',
  'displayName',
  'extraGlobals',
  'globalSetup',
  'globalTeardown',
  'moduleNameMapper',
  'resetMocks',
  'resetModules',
  'restoreMocks',
  'snapshotSerializers',
  'testMatch',
  'transform',
  'transformIgnorePatterns',
  'watchPathIgnorePatterns',
];
if (overrides) {
  supportedKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      if (Array.isArray(config[key]) || typeof config[key] !== 'object') {
        // for arrays or primitive types, directly override the config key
        config[key] = overrides[key];
      } else {
        // for object types, extend gracefully
        config[key] = Object.assign({}, config[key], overrides[key]);
      }

      delete overrides[key];
    }
  });
  const unsupportedKeys = Object.keys(overrides);
  if (unsupportedKeys.length) {
    const isOverridingSetupFile =
      unsupportedKeys.indexOf('setupFilesAfterEnv') > -1;

    if (isOverridingSetupFile) {
      console.error(
        chalk.red(
          'We detected ' +
            chalk.bold('setupFilesAfterEnv') +
            ' in your package.json.\n\n' +
            'Remove it from Jest configuration, and put the initialization code in ' +
            chalk.bold('src/setupTests.js') +
            '.\nThis file will be loaded automatically.\n',
        ),
      );
    } else {
      console.error(
        chalk.red(
          '\nOut of the box, Create React App only supports overriding ' +
            'these Jest options:\n\n' +
            supportedKeys
              .map((key) => chalk.bold('  \u2022 ' + key))
              .join('\n') +
            '.\n\n' +
            'These options in your package.json Jest configuration ' +
            'are not currently supported by Create React App:\n\n' +
            unsupportedKeys
              .map((key) => chalk.bold('  \u2022 ' + key))
              .join('\n') +
            '\n\nIf you wish to override other Jest options, you need to ' +
            'eject from the default setup. You can do so by running ' +
            chalk.bold('npm run eject') +
            ' but remember that this is a one-way operation. ' +
            'You may also file an issue with Create React App to discuss ' +
            'supporting more options out of the box.\n',
        ),
      );
    }

    process.exit(1);
  }
}
module.exports = config;
