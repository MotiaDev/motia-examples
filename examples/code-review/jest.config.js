// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'], // Look for test files with .test.ts extension
  collectCoverageFrom: ['steps/**/*.ts'], // Collect coverage from step files
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'], // Ignore node_modules and dist folders
  testTimeout: 30000, // Set global timeout to 30 seconds for all tests
}; 