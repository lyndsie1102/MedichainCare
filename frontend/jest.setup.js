import '@testing-library/jest-dom';
module.exports = {
  // Use the jsdom environment for browser-like testing
  testEnvironment: 'jsdom',

  // THIS IS THE CRITICAL FIX
  // Explicitly tell Jest to look for modules in node_modules and the src directory.
  // The default is just ["node_modules"], but something is overriding or breaking it.
  moduleDirectories: ['node_modules', 'src'],

  // Point to a setup file for global mocks and setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Continue to ignore transformations for most node_modules, except for axios
  transformIgnorePatterns: [
    "/node_modules/(?!axios)/"
  ],

  // Standard Babel transform for JS/JSX files
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // Helper for handling CSS module imports if you use them
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};