module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/Courier_Prime/'
  ],

  // Transform files with Babel
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],

  // Coverage configuration
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.config.js',
    '!gulpfile.js'
  ],

  // Setup files after environment
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Coverage threshold (fixed typo)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  }
};
