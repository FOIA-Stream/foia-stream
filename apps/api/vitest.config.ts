import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use Bun's built-in test runner compatibility
    globals: true,
    environment: 'node',

    // Test file patterns
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'data'],

    // Setup files run before each test file
    setupFiles: ['./tests/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/types/**', 'node_modules/**'],
      thresholds: {
        // Thresholds disabled since we test via mock endpoints instead of actual services
        // The actual services use bun:sqlite which isn't available in Node.js/Vitest
        // Consider using bun:test for higher coverage of production code
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },

    // Timeout for async tests
    testTimeout: 10000,
    hookTimeout: 10000,

    // Run tests sequentially to avoid DB conflicts
    sequence: {
      concurrent: false,
    },

    // Type checking
    typecheck: {
      enabled: false, // Disable inline typecheck, use tsc separately
    },
  },

  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
