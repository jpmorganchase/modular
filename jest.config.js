// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: [
    '.*/template/.*',
    '<rootDir>/e2e-tests/',
    '/node_modules/',
  ],

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: ['<rootDir>/scripts/jest/setupTests.ts'],
};
