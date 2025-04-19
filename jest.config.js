module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.{js,ts}'],
  moduleDirectories: ['node_modules', 'src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
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
  roots: ['<rootDir>/']
}; 