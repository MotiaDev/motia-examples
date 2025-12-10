module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!.*@motiadev)'],
  moduleNameMapper: {
    '^@motiadev/test(.*)$': '<rootDir>/node_modules/@motiadev/test/dist$1',
    '^motia(.*)$': '<rootDir>/node_modules/motia/dist$1',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  clearMocks: true,
  resetMocks: true,
}
