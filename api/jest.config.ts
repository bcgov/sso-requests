module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/src'],
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx|js)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/jest.setup.ts'],
  //testSequencer: '<rootDir>/jest-api/testSequencer.js',
  testPathIgnorePatterns: ['/node_modules/', '/build/', '<rootDir>/jest-api/helpers/fixtures.ts'],
  //transformIgnorePatterns: ['/node_modules/(?!(@keycloak|url-join|url-template|camelize-ts)/)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  verbose: true,
  coverageReporters: ['json', 'html'],
  testEnvironment: 'node',
};
