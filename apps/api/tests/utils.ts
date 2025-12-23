// ============================================
// FOIA Stream - Test Utilities
// ============================================

import type { Database } from 'better-sqlite3';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import * as schema from '../src/db/schema';

// Type for accessing internal drizzle session
interface DrizzleWithSession {
  session: {
    client: Database;
  };
}

/**
 * Create a fresh test database instance
 */
export function createTestDb(dbPath = './data/test.db'): {
  db: ReturnType<typeof drizzle>;
  sqlite: Database;
} {
  // Clean up existing files
  if (existsSync(dbPath)) {
    rmSync(dbPath, { force: true });
  }
  if (existsSync(`${dbPath}-shm`)) {
    rmSync(`${dbPath}-shm`, { force: true });
  }
  if (existsSync(`${dbPath}-wal`)) {
    rmSync(`${dbPath}-wal`, { force: true });
  }

  // Ensure directory exists
  const dir = dbPath.substring(0, dbPath.lastIndexOf('/'));
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Create database
  const sqlite = new BetterSqlite3(dbPath);
  sqlite.exec('PRAGMA journal_mode = WAL');

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}

/**
 * Apply migrations to test database
 */
export function applyMigrations(db: ReturnType<typeof drizzle>) {
  // Use drizzle push to create tables
  // For tests, we'll create tables directly from schema
  const sqlite = (db as unknown as DrizzleWithSession).session.client;

  // Create tables using raw SQL from schema definitions
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'civilian' NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      organization TEXT,
      is_verified INTEGER DEFAULT 0 NOT NULL,
      is_anonymous INTEGER DEFAULT 0 NOT NULL,
      two_factor_enabled INTEGER DEFAULT 0 NOT NULL,
      two_factor_secret TEXT,
      failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
      locked_until TEXT,
      last_failed_login_at TEXT,
      password_changed_at TEXT,
      must_change_password INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agencies (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      abbreviation TEXT,
      jurisdiction_level TEXT NOT NULL,
      state TEXT,
      city TEXT,
      county TEXT,
      foia_email TEXT,
      foia_address TEXT,
      foia_portal_url TEXT,
      response_deadline_days INTEGER DEFAULT 20 NOT NULL,
      appeal_deadline_days INTEGER DEFAULT 30 NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS request_templates (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      template_text TEXT NOT NULL,
      jurisdiction_level TEXT,
      created_by TEXT REFERENCES users(id),
      is_official INTEGER DEFAULT 0 NOT NULL,
      use_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS foia_requests (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agency_id TEXT NOT NULL REFERENCES agencies(id),
      status TEXT DEFAULT 'draft' NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      date_range_start TEXT,
      date_range_end TEXT,
      template_id TEXT REFERENCES request_templates(id),
      tracking_number TEXT,
      estimated_fee REAL,
      actual_fee REAL,
      submitted_at TEXT,
      acknowledged_at TEXT,
      due_date TEXT,
      completed_at TEXT,
      denial_reason TEXT,
      is_public INTEGER DEFAULT 1 NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY NOT NULL,
      request_id TEXT NOT NULL REFERENCES foia_requests(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      document_type TEXT NOT NULL,
      is_redacted INTEGER DEFAULT 0 NOT NULL,
      redaction_reason TEXT,
      metadata TEXT,
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY NOT NULL,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT DEFAULT 'general' NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER,
      is_anonymous INTEGER DEFAULT 0 NOT NULL,
      upvotes INTEGER DEFAULT 0 NOT NULL,
      downvotes INTEGER DEFAULT 0 NOT NULL,
      is_verified INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comment_votes (
      id TEXT PRIMARY KEY NOT NULL,
      comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appeals (
      id TEXT PRIMARY KEY NOT NULL,
      request_id TEXT NOT NULL REFERENCES foia_requests(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      grounds TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      response_at TEXT,
      response_text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agency_stats (
      id TEXT PRIMARY KEY NOT NULL,
      agency_id TEXT NOT NULL REFERENCES agencies(id) UNIQUE,
      total_requests INTEGER DEFAULT 0 NOT NULL,
      pending_requests INTEGER DEFAULT 0 NOT NULL,
      fulfilled_requests INTEGER DEFAULT 0 NOT NULL,
      denied_requests INTEGER DEFAULT 0 NOT NULL,
      appealed_requests INTEGER DEFAULT 0 NOT NULL,
      average_response_days REAL,
      compliance_rate REAL,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0 NOT NULL,
      related_entity_type TEXT,
      related_entity_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);
}

/**
 * Clean up test database
 */
export function cleanupTestDb(sqlite: Database, dbPath = './data/test.db') {
  try {
    sqlite.close();
  } catch (_e) {
    // Ignore close errors
  }

  if (existsSync(dbPath)) {
    rmSync(dbPath, { force: true });
  }
  if (existsSync(`${dbPath}-shm`)) {
    rmSync(`${dbPath}-shm`, { force: true });
  }
  if (existsSync(`${dbPath}-wal`)) {
    rmSync(`${dbPath}-wal`, { force: true });
  }
}

/**
 * Clear all data from test database
 */
export function clearTestData(sqlite: Database) {
  sqlite.exec(`
    DELETE FROM notifications;
    DELETE FROM audit_logs;
    DELETE FROM agency_stats;
    DELETE FROM comment_votes;
    DELETE FROM comments;
    DELETE FROM documents;
    DELETE FROM appeals;
    DELETE FROM foia_requests;
    DELETE FROM sessions;
    DELETE FROM request_templates;
    DELETE FROM agencies;
    DELETE FROM users;
  `);
}

/**
 * Test data generators
 */
export const testData = {
  user: (overrides = {}) => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'civilian' as const,
    ...overrides,
  }),

  agency: (overrides = {}) => ({
    name: `Test Agency ${Date.now()}`,
    abbreviation: 'TA',
    jurisdictionLevel: 'federal' as const,
    foiaEmail: 'foia@testagency.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 30,
    ...overrides,
  }),

  request: (userId: string, agencyId: string, overrides = {}) => ({
    userId,
    agencyId,
    category: 'incident_report' as const,
    title: `Test Request ${Date.now()}`,
    description: 'This is a test FOIA request for testing purposes.',
    isPublic: true,
    ...overrides,
  }),

  template: (overrides = {}) => ({
    name: `Test Template ${Date.now()}`,
    category: 'incident_report' as const,
    description: 'A test template for FOIA requests',
    templateText: 'Dear Records Officer, I am requesting all documents related to {{subject}}.',
    isOfficial: false,
    ...overrides,
  }),
};

/**
 * Create an authenticated test context
 */
export async function createAuthenticatedUser(_db: ReturnType<typeof drizzle>) {
  const { authService } = await import('../src/services/auth.service');
  const userData = testData.user();
  const user = await authService.createUser(userData);
  const { token } = await authService.login(userData.email, userData.password);

  return { user, token, userData };
}
