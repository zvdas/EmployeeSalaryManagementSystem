// @ts-check
const { createCjsPreset } = require('jest-preset-angular/presets');

/** @type {import('jest').Config} */
module.exports = {
  ...createCjsPreset({
    // jsdom environment shipped by jest-preset-angular (uses the jsdom devDependency).
    testEnvironment: 'jest-preset-angular/environments/jest-jsdom-env',
  }),
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  // A regex rather than a glob: on Windows the glob form matched nothing when the repo lives under
  // a dot-directory (e.g. a git worktree under `.claude/`).
  testRegex: String.raw`[/\\]src[/\\].+\.spec\.ts$`,
  collectCoverageFrom: ['src/app/**/*.ts', '!src/app/**/*.spec.ts', '!src/app/**/index.ts'],
};
