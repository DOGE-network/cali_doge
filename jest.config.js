module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  moduleDirectories: ['node_modules', 'src'],
  transform: {},
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.next/',
    '/public/',
    '/src/tests/'
  ]
}; 