// ============================================
// FOIA Stream - Test Setup
// ============================================

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { afterAll, beforeAll } from 'vitest';

// Use a separate test database
process.env.DATABASE_URL = './data/test.db';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

// Ensure test data directory exists
const testDataDir = './data';
if (!existsSync(testDataDir)) {
  mkdirSync(testDataDir, { recursive: true });
}

// Clean up test database before all tests
beforeAll(async () => {
  const testDbPath = './data/test.db';

  // Remove existing test database files
  if (existsSync(testDbPath)) {
    rmSync(testDbPath, { force: true });
  }
  if (existsSync(`${testDbPath}-shm`)) {
    rmSync(`${testDbPath}-shm`, { force: true });
  }
  if (existsSync(`${testDbPath}-wal`)) {
    rmSync(`${testDbPath}-wal`, { force: true });
  }
});

// Global teardown
afterAll(async () => {
  // Clean up happens per test file, not globally
});
