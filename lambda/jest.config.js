module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['./__tests__/jest.setup.js'],
  testSequencer: './testSequencer.js',
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/../app/$1',
    '^@lambda-app/(.*)$': '<rootDir>/app/src/$1',
    '^@lambda-shared/(.*)$': '<rootDir>/shared/$1',
  },
};
