module.exports = {
  roots: ['<rootDir>/web/src'],
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }]
  },
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/web/src/test/styleMock.js'
  },
  setupFilesAfterEnv: ['<rootDir>/web/src/test/setupTests.ts']
};
