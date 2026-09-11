module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/test'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  coverageReporters: ['json', 'html'],
};
