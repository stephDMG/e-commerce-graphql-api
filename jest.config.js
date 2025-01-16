module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@graphql/(.*)$': '<rootDir>/src/graphql/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
};
