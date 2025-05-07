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
    '\\.[jt]sx?$': 'babel-jest',
    // IMPORTANT: js is here intentionally to transform js files with ES Module syntax. The overriding config file allows js.
    '^.+\\.(ts|tsx|js)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest-api/jest.setup.js'],
  testSequencer: '<rootDir>/jest-api/testSequencer.js',
  testPathIgnorePatterns: ['/node_modules/', '/build/', '<rootDir>/jest-api/helpers/fixtures.ts'],
  transformIgnorePatterns: ['/node_modules/(?!(@keycloak|url-join|url-template|camelize-ts)/)'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/$1',
    '^@pages(.*)$': '<rootDir>/pages$1',
    '^@utils(.*)$': '<rootDir>/utils$1',
  },
  verbose: true,
  coverageReporters: ['json', 'html'],
  testEnvironment: 'node',
};
