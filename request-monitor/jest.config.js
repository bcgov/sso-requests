module.exports = {
  roots: ['<rootDir>'],
  preset: 'ts-jest/presets/js-with-ts',
  transform: {
    '^.+\\.(ts|tsx|js)$': ['ts-jest'],
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  verbose: true,
  modulePaths: ['<rootDir>'],
  testEnvironment: 'node',
  verbose: true,
};
