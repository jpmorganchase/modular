import * as fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import type { Config } from '@jest/types';
import { getCracoJestConfig } from '../index';
import getModularRoot from '../../utils/getModularRoot';
import { ModularPackageJson } from '../../utils/isModularType';

// Priority of jest configurations:
// 1. modular root jest config
// 2. craco config

// This list may change as we learn of options where flexibility would be valuable
const supportedOverrides = [
  'collectCoverageFrom',
  'coveragePathIgnorePatterns',
  'coverageThreshold',
  'modulePathIgnorePatterns',
  'testPathIgnorePatterns',
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

export default function createJestConfig(): Config.InitialOptions {
  const modularRoot = getModularRoot();

  const rootPackageJson = fs.readJSONSync(
    path.join(modularRoot, 'package.json'),
  ) as ModularPackageJson;

  const packageJsonJest = rootPackageJson?.jest as
    | Config.InitialOptions
    | undefined;

  const jestConfigFile = fs.existsSync(
    path.join(modularRoot, 'jest.config.js'),
  );

  const jestConfig = getCracoJestConfig() as Config.InitialOptions;

  if (jestConfigFile) {
    console.error(
      chalk.red(
        'We detected a jest.config.js file in your root directory.\n' +
          'We read your jest options from package.json.\n',
        `
        {
          "jest": {}
        }
        `,
      ),
    );
    process.exit(1);
  }

  if (packageJsonJest) {
    const customJest = (
      packageJsonJest
        ? packageJsonJest
        : require(path.join(modularRoot, 'jest.config.js'))
    ) as Config.InitialOptions;

    const overrideKeys = Object.keys(customJest);
    const unsupportedOverrides = overrideKeys.filter(
      (key) => !supportedOverrides.includes(key),
    );
    const setUpOptions = unsupportedOverrides.filter(
      (key) => key === 'setupFiles' || key === 'setupFilesAfterEnv',
    );

    if (setUpOptions.length) {
      console.error(
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
      process.exit(1);
    }

    if (unsupportedOverrides.length) {
      console.error(
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
      process.exit(1);
    }

    Object.assign(jestConfig, customJest);
  }
  return jestConfig;
}
