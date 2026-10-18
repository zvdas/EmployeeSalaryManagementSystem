import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Every test builds its own in-memory database and the app has no module-level state,
    // so test files can share workers; this skips ~1.5s of per-file startup.
    isolate: false,
  },
});
