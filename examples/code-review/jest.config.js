// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/code_review/**/*.test.ts'], // Look for test files with .test.ts extension
  collectCoverageFrom: ['steps/**/*.ts'], // Collect coverage from step files
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'], // Ignore node_modules and dist folders
  testTimeout: 30000, // Set global timeout to 30 seconds for all tests
  globals: {
    'ts-jest': {
      isolatedModules: true, // Turn off type checking
      diagnostics: false, // Turn off diagnostic reports
      tsconfig: {
        // Override tsconfig for tests
        noImplicitAny: false,
        strictNullChecks: false
      }
    }
  }
}; 