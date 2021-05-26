import * as fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import glob from 'glob';
import type { Config } from '@jest/types';
import { defaults } from 'jest-config';
import getModularRoot from '../../utils/getModularRoot';
import { ModularPackageJson } from '../../utils/isModularType';

// This list may change as we learn of options where flexibility would be valuable
const supportedOverrides = [
  'collectCoverageFrom',
  'coveragePathIgnorePatterns',
  'coverageThreshold',
  'modulePathIgnorePatterns',
  'testPathIgnorePatterns',
  'transformIgnorePatterns',
  'testRunner',
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
    testPathIgnorePatterns: ['/node_modules/'],
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
      .concat([require.resolve('react-scripts/config/env.js')])
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

    Object.assign(jestConfig, packageJsonJest);
  }
  return jestConfig;
}
