const nextJest = require('next/jest');

// Providing the path to your Next.js app which will enable loading next.config.js and .env files
const createJestConfig = nextJest({ dir: './' });

// Any custom config you want to pass to Jest
const customJestConfig = {};

// createJestConfig is exported in this way to ensure that next/jest can load the Next.js configuration, which is async
module.exports = createJestConfig(customJestConfig);

module.exports = {
  rootDir: '.',
  preset: 'ts-jest/presets/js-with-ts',
  testMatch: ['<rootDir>/jest-api/**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    // configFile rather than the file-relative .babelrc, so files outside this
    // directory — packages/authz — are transformed too.
    '\\.[jt]sx?$': ['babel-jest', { configFile: require.resolve('./.babelrc') }],
    // IMPORTANT: js is here intentionally to transform js files with ES Module syntax. The overriding config file allows js.
    '^.+\\.(ts|tsx|js)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest-api/jest.setup.js'],
  testSequencer: '<rootDir>/jest-api/testSequencer.js',
  globalSetup: '<rootDir>/jest-api/global-setup.js',
  testPathIgnorePatterns: ['/node_modules/', '/build/', '<rootDir>/jest-api/helpers/fixtures.ts'],
  transformIgnorePatterns: ['/node_modules/(?!(@keycloak|url-join|url-template|camelize-ts)/)'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/$1',
    '^@sso/authz$': '<rootDir>/../packages/authz/src',
    '^@sso/audit$': '<rootDir>/../packages/audit/src',
    '^@sso/audit/server$': '<rootDir>/../packages/audit/src/server',
    '^@sso/logs-query$': '<rootDir>/../packages/logs-query/src',
    '^@pages(.*)$': '<rootDir>/pages$1',
    '^@utils(.*)$': '<rootDir>/utils$1',
  },
  // So source compiled from ../packages finds the babel runtime helpers the
  // transform injects into it.
  modulePaths: ['<rootDir>/node_modules'],
  verbose: true,
  coverageReporters: ['json', 'html'],
  testEnvironment: 'node',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/jest-api/test-results',
        pageTitle: 'SSO Requests API Unit Test Report',
        filename: 'report.html',
        includeConsoleLog: true,
      },
    ],
  ],
};
