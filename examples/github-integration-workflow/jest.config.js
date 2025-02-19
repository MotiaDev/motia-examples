module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  transformIgnorePatterns: [
    "/node_modules/(?!.*@motiadev)"
  ],
  moduleNameMapper: {
    '^@motiadev/core(.*)$': '<rootDir>/node_modules/@motiadev/core/dist$1'
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  clearMocks: true,
  resetMocks: true
} 