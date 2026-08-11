/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform: {},
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      lines: 70,
      functions: 70,
      branches: 60,
    },
  },
};
