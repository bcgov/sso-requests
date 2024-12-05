module.exports = {
  roots: ['<rootDir>'],
  preset: 'ts-jest/presets/js-with-ts',
  testMatch: ['**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    // IMPORTANT: js is here intentionally to transform js files with ES Module syntax. The overriding config file allows js.
    '^.+\\.(ts|tsx|js)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.jest.json',
      },
    ],
  },
  setupFilesAfterEnv: ['./__tests__/jest.setup.js'],
  testSequencer: './testSequencer.js',
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  transformIgnorePatterns: ['/node_modules/(?!(@keycloak|url-join|url-template|camelize-ts)/)'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/../app/$1',
    '^@lambda-app/(.*)$': '<rootDir>/app/src/$1',
    '^@lambda-shared/(.*)$': '<rootDir>/shared/$1',
    '^@lambda-css-api/(.*)$': '<rootDir>/css-api/src/$1',
    '^@request-queue/(.*)$': '<rootDir>/request-queue/src/$1',
  },
  verbose: true,
  coverageReporters: ['json', 'html'],
};
