module.exports = {
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/cypress/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@components(.*)$': '<rootDir>/components$1',
    '^@pages(.*)$': '<rootDir>/pages$1',
    '^@utils(.*)$': '<rootDir>/utils$1',
    // For css module handling
    '\\.css$': '<rootDir>/jest/mocks/styleMock.js',
  },
  moduleDirectories: ['./node_modules', '.'],
  testEnvironment: 'jsdom',
};
