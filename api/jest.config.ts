module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/src'],
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/jest.setup.ts'],
  testSequencer: '<rootDir>/src/tests/testSequencer.js',
  globalSetup: '<rootDir>/src/tests/global-setup.js',
  testPathIgnorePatterns: ['/node_modules/', '/build/', '<rootDir>/jest-api/helpers/fixtures.ts'],
  //transformIgnorePatterns: ['/node_modules/(?!(@keycloak|url-join|url-template|camelize-ts)/)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@sso/authz$': '<rootDir>/../packages/authz/src',
    '^@sso/audit$': '<rootDir>/../packages/audit/src',
    '^@sso/audit/server$': '<rootDir>/../packages/audit/src/server',
    '^@sso/logs-query$': '<rootDir>/../packages/logs-query/src',
  },
  verbose: true,
  coverageReporters: ['json', 'html'],
  testEnvironment: 'node',
};
