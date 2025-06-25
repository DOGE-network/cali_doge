const testMode = process.env.TEST_MODE || 'mock';

let testMatch = ['**/__tests__/**/*.test.{js,ts}'];
if (testMode === 'mock' || testMode === 'unit') {
  testMatch = ['**/__tests__/unit/**/*.test.{js,ts}'];
} else if (testMode === 'integration') {
  testMatch = ['**/__tests__/integration/**/*.test.{js,ts}'];
} else if (testMode === 'e2e') {
  testMatch = ['**/__tests__/e2e/**/*.test.{js,ts}'];
}

module.exports = {
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', 'src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testMatch,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  verbose: true,
  collectCoverage: false,
  coverageDirectory: '__tests__/coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/.next/',
    '/public/'
  ],
  rootDir: '.',
  roots: ['<rootDir>/'],
  setupFiles: ['<rootDir>/jest.env.js'],
}; 