module.exports = {
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/cypress/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/$1',
    '^@components(.*)$': '<rootDir>/components$1',
    '^@pages(.*)$': '<rootDir>/pages$1',
    '^@utils(.*)$': '<rootDir>/utils$1',
    // For css module handling
    '\\.css$': '<rootDir>/jest/mocks/styleMock.js',
    typography: 'typography/dist/index', // prevent jest `require` the base file itself in runtime
  },
  modulePaths: ['<rootDir>'],
  moduleDirectories: ['node_modules', '.'],
  testEnvironment: 'jsdom',
  rootDir: '.',
  verbose: true,
};
