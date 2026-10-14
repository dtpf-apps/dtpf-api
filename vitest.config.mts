import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Set explicitly: the config module refuses any value it does not know, and a
    // NODE_ENV left over in the shell must not decide what the suite runs against.
    env: { NODE_ENV: 'test' },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/**/*.test.ts'],
          exclude: ['test/e2e/**'],
        },
      },
      {
        // Real HTTP through supertest against a real MongoDB (mongodb-memory-server).
        // Only SMTP is replaced, at the email service boundary.
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.test.ts'],
          globalSetup: ['test/e2e/globalSetup.ts'],
          setupFiles: ['test/e2e/setup.ts'],
          // With a sender configured the contact flow takes its notification branch.
          env: { NODE_ENV: 'test', SMTP_USER: 'e2e-sender' },
          // The first run downloads a mongod binary and caches it.
          hookTimeout: 120_000,
          testTimeout: 15_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/interfaces/**'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
