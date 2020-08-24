// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  // See: https://github.com/facebook/jest/issues/2713#issuecomment-430402012
  testRunner: 'jest-circus/runner',

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage-e2e-tests',
  testMatch: ['<rootDir>/e2e-tests/**/*.test.{js,ts}'],

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: ['<rootDir>/scripts/jest/setupTests.ts'],
};
