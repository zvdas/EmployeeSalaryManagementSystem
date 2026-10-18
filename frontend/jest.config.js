// @ts-check
const { createCjsPreset } = require('jest-preset-angular/presets');

/** @type {import('jest').Config} */
module.exports = {
  ...createCjsPreset({
    // jsdom environment shipped by jest-preset-angular (uses the jsdom devDependency).
    testEnvironment: 'jest-preset-angular/environments/jest-jsdom-env',
  }),
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  collectCoverageFrom: ['src/app/**/*.ts', '!src/app/**/*.spec.ts', '!src/app/**/index.ts'],
};
