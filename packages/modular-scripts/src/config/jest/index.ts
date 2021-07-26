import * as fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import isCi from 'is-ci';
import globby from 'globby';
import type { Config } from '@jest/types';
import { defaults } from 'jest-config';
import getModularRoot from '../../utils/getModularRoot';
import { ModularPackageJson } from '../../utils/isModularType';

// This list may change as we learn of options where flexibility would be valuable.
// Based on react-scripts supported override options
const supportedOverrides = [
  'collectCoverageFrom',
  'coveragePathIgnorePatterns',
  'coverageThreshold',
  'moduleNameMapper',
  'modulePathIgnorePatterns',
  'testPathIgnorePatterns',
  'testRunner',
  'transformIgnorePatterns',
];

type SetUpFilesMap = {
  [name: string]: string;
  setupFiles: string;
  setupFilesAfterEnv: string;
};

const modulularSetUpFilesMap: SetUpFilesMap = {
  setupFiles: 'setupEnvironment',
  setupFilesAfterEnv: 'setupTests',
};

interface TestCliOptions {
  reporters?: string[];
  testResultsProcessor?: string;
}

export function createJestConfig(
  cliOptions: TestCliOptions,
): Config.InitialOptions {
  const modularRoot = getModularRoot();
  const absolutePackagesPath = path.resolve(modularRoot, 'packages');
  const absoluteModularGlobalConfigsPath = path.resolve(modularRoot, 'modular');

  const jestConfig: Config.InitialOptions = {
    ...defaults,
    ...cliOptions,
    displayName: 'test',
    resetMocks: false,
    transform: {
      '^.+\\.(js|jsx|mjs|cjs)$': [
        require.resolve('babel-jest'),
        {
          presets: [require.resolve('babel-preset-react-app')],
        },
      ],
      '^.+\\.(ts|tsx)$': require.resolve('ts-jest'),
      '^.+\\.(css|scss)$': require.resolve('jest-transform-stub'),
      '.+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
        require.resolve('jest-transform-stub'),
    },
    transformIgnorePatterns: [
      '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$',
      '^.+\\.module\\.(css|sass|scss)$',
    ],
    moduleNameMapper: {
      '^.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$':
        require.resolve('jest-transform-stub'),
      '^react-native$': require.resolve('react-native-web'),
    },
    watchPlugins: [
      require.resolve('jest-watch-typeahead/filename'),
      require.resolve('jest-watch-typeahead/testname'),
    ],
    moduleFileExtensions: [
      'web.js',
      'js',
      'web.ts',
      'ts',
      'web.tsx',
      'tsx',
      'json',
      'web.jsx',
      'jsx',
      'node',
    ],
    testRunner: require.resolve('jest-circus/runner'),
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    rootDir: absolutePackagesPath,
    roots: ['<rootDir>'],
    testMatch: ['<rootDir>/**/src/**/*.{spec,test}.{js,ts,tsx}'],
    coverageDirectory: path.resolve(modularRoot, 'coverage'),
    collectCoverageFrom: ['<rootDir>/**/src/**/*.{js,ts,tsx}', '!**/*.d.ts'],
    coveragePathIgnorePatterns: [
      '/__tests__/',
      '/node_modules/',
      'serviceWorker.ts',
    ],
    setupFiles: defaults.setupFiles
      .concat([
        require.resolve('modular-scripts/react-scripts/config/setupEnv.js'),
      ])
      .concat(
        globby
          .sync(`setupEnvironment.{js,ts,tsx}`, {
            cwd: absoluteModularGlobalConfigsPath,
          })
          .map((f) => path.join(absoluteModularGlobalConfigsPath, f)),
      ),
    setupFilesAfterEnv: globby
      .sync(`setupTests.{js,ts,tsx}`, {
        cwd: absoluteModularGlobalConfigsPath,
      })
      .map((f) => path.join(absoluteModularGlobalConfigsPath, f)),
  };

  const rootPackageJson = fs.readJSONSync(
    path.join(modularRoot, 'package.json'),
  ) as ModularPackageJson;

  const packageJsonJest = rootPackageJson?.jest as
    | Config.InitialOptions
    | undefined;

  const jestConfigFile = fs.existsSync(
    path.join(modularRoot, 'jest.config.js'),
  );

  if (jestConfigFile) {
    throw new Error(
      chalk.red(
        '\nWe detected a jest.config.js file in your root directory.\n' +
          'We read your jest options from package.json.\n',
        `
        {
          "jest": {}
        }
        `,
      ),
    );
  }

  if (packageJsonJest) {
    const overrideKeys = Object.keys(packageJsonJest);
    const unsupportedOverrides = overrideKeys.filter(
      (key) => !supportedOverrides.includes(key),
    );
    const setUpOptions = unsupportedOverrides.filter(
      (key) => key === 'setupFiles' || key === 'setupFilesAfterEnv',
    );

    if (setUpOptions.length) {
      throw new Error(
        chalk.red(
          '\n We detected options in your Jest configuration' +
            ' that should be initialized in here: \n\n' +
            setUpOptions
              .map((key) =>
                chalk.bold(
                  '  \u2022 ' +
                    key +
                    `: modular/${modulularSetUpFilesMap[key]}.{js,ts}`,
                ),
              )
              .join('\n'),
          '\n\n We will load theses files for you. \n',
        ),
      );
    }

    if (unsupportedOverrides.length) {
      throw new Error(
        chalk.red(
          '\nModular only supports overriding these Jest options:\n\n' +
            supportedOverrides
              .map((key) => chalk.bold('  \u2022 ' + key))
              .join('\n') +
            '\n\n' +
            'These options are not supported by Modular:\n\n' +
            unsupportedOverrides
              .map((key) => chalk.bold('  \u2022 ' + key))
              .join('\n'),
          '\n',
        ),
      );
    }

    const mergedMapper: Record<string, string | Array<string>> = {
      ...jestConfig.moduleNameMapper,
      ...packageJsonJest.moduleNameMapper,
    };

    Object.assign(jestConfig, {
      ...packageJsonJest,
      moduleNameMapper: mergedMapper,
    });
  }

  // don't typecheck tests in CI
  if (isCi) {
    jestConfig.globals = {
      'ts-jest': {
        diagnostics: false,
        isolatedModules: true,
      },
    };
  }

  return jestConfig;
}
