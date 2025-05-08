module.exports = {
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/cypress/'],
  testMatch: ['<rootDir>/jest/**/?(*.)+(spec|test).+(ts|tsx|js)'],
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
  transform: { '\\.[jt]sx?$': 'babel-jest' },
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!(@rjsf)/)', '\\.pnp\\.[^\\/]+$'],
  modulePaths: ['<rootDir>'],
  moduleDirectories: ['node_modules'],
  testEnvironment: 'jsdom',
  rootDir: '.',
  verbose: true,
  coverageReporters: ['json', 'html'],
  testMatch: ['<rootDir>/jest/**/?(*.)+(spec|test).+(ts|tsx|js)'],
};
