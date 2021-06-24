module.exports = {
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@components(.*)$': '<rootDir>/components$1',
    '^@pages(.*)$': '<rootDir>/pages$1',
    // For css module handling
    '\\.css$': 'identity-obj-proxy',
  },
  testEnvironment: 'jsdom',
};
