const testMode = process.env.TEST_MODE;

let testMatch = ['**/__tests__/**/*.test.{js,ts}'];
if (testMode === 'mock' || testMode === 'unit') {
  testMatch = ['**/__tests__/unit/**/*.test.{js,ts}'];
} else if (testMode === 'integration') {
  testMatch = ['**/__tests__/integration/**/*.test.{js,ts}'];
} else if (testMode === 'e2e') {
  testMatch = ['**/__tests__/e2e/**/*.test.{js,ts}'];
}
// If no TEST_MODE is specified, run all tests (default behavior)

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
  // Coverage is disabled by default - use --coverage flag to enable
  collectCoverage: false,
  coverageDirectory: '__tests__/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/scripts/**/*',
    '!src/data/**/*'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/.next/',
    '/public/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  },
  rootDir: '.',
  roots: ['<rootDir>/'],
  setupFiles: ['<rootDir>/jest.env.js'],
}; 