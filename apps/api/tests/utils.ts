/**
 * Copyright (c) 2025 Foia Stream
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// ============================================
// FOIA Stream - Test Utilities
// ============================================

import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';

let pool: Pool | null = null;

/**
 * Create a fresh test database instance
 */
export async function createTestDb(connectionString?: string): Promise<{
  db: NodePgDatabase<typeof schema>;
  pool: Pool;
}> {
  const testConnectionString =
    connectionString ||
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/foia_stream_test';

  pool = new Pool({
    connectionString: testConnectionString,
    max: 5,
  });

  const db = drizzle(pool, { schema });

  // Create tables if they don't exist
  await applyMigrations(db);

  return { db, pool };
}

/**
 * Apply migrations to test database
 */
export async function applyMigrations(db: NodePgDatabase<typeof schema>) {
  // Create tables using raw SQL from schema definitions
  // Note: In production, use drizzle-kit push or migrations
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'civilian' NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      organization TEXT,
      is_verified BOOLEAN DEFAULT false NOT NULL,
      is_anonymous BOOLEAN DEFAULT false NOT NULL,
      two_factor_enabled BOOLEAN DEFAULT false NOT NULL,
      two_factor_secret TEXT,
      failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
      locked_until TIMESTAMP,
      last_failed_login_at TIMESTAMP,
      password_changed_at TIMESTAMP,
      must_change_password BOOLEAN DEFAULT false NOT NULL,
      terms_accepted_at TIMESTAMP,
      privacy_accepted_at TIMESTAMP,
      data_processing_consent_at TIMESTAMP,
      marketing_consent_at TIMESTAMP,
      consent_updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      device_name TEXT,
      last_active_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_hash TEXT NOT NULL,
      key_preview TEXT NOT NULL,
      name TEXT DEFAULT 'Default' NOT NULL,
      last_used_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
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
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS request_templates (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      template_text TEXT NOT NULL,
      jurisdiction_level TEXT,
      created_by TEXT REFERENCES users(id),
      is_official BOOLEAN DEFAULT false NOT NULL,
      usage_count INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS foia_requests (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agency_id TEXT NOT NULL REFERENCES agencies(id),
      status TEXT DEFAULT 'draft' NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      date_range_start TIMESTAMP,
      date_range_end TIMESTAMP,
      template_id TEXT REFERENCES request_templates(id),
      tracking_number TEXT,
      estimated_fee REAL,
      actual_fee REAL,
      submitted_at TIMESTAMP,
      acknowledged_at TIMESTAMP,
      due_date TIMESTAMP,
      completed_at TIMESTAMP,
      denial_reason TEXT,
      is_public BOOLEAN DEFAULT true NOT NULL,
      content_purge_at TIMESTAMP,
      content_purged BOOLEAN DEFAULT false NOT NULL,
      title_hash TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY NOT NULL,
      request_id TEXT REFERENCES foia_requests(id),
      agency_id TEXT NOT NULL REFERENCES agencies(id),
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      is_redacted BOOLEAN DEFAULT false NOT NULL,
      is_public BOOLEAN DEFAULT false NOT NULL,
      transcript TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY NOT NULL,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT DEFAULT 'general' NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER,
      is_anonymous BOOLEAN DEFAULT false NOT NULL,
      upvotes INTEGER DEFAULT 0 NOT NULL,
      downvotes INTEGER DEFAULT 0 NOT NULL,
      is_verified BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comment_votes (
      id TEXT PRIMARY KEY NOT NULL,
      comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appeals (
      id TEXT PRIMARY KEY NOT NULL,
      request_id TEXT NOT NULL REFERENCES foia_requests(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      grounds TEXT NOT NULL,
      submitted_at TIMESTAMP NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      response_at TIMESTAMP,
      response_text TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      details JSONB,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
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
      last_updated TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS use_of_force_stats (
      id TEXT PRIMARY KEY NOT NULL,
      agency_id TEXT NOT NULL REFERENCES agencies(id),
      year INTEGER NOT NULL,
      total_incidents INTEGER DEFAULT 0 NOT NULL,
      by_type JSONB,
      by_outcome JSONB,
      officer_involved_shootings INTEGER DEFAULT 0 NOT NULL,
      complaints INTEGER DEFAULT 0 NOT NULL,
      sustained_complaints INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_articles (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      state TEXT,
      is_published BOOLEAN DEFAULT false NOT NULL,
      view_count INTEGER DEFAULT 0 NOT NULL,
      created_by TEXT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS consent_history (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      consent_type TEXT NOT NULL,
      action TEXT NOT NULL,
      policy_version TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS secure_documents (
      id TEXT PRIMARY KEY NOT NULL,
      uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      original_file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      sha256_hash TEXT NOT NULL,
      status TEXT DEFAULT 'pending_scan' NOT NULL,
      virus_scan_result JSONB,
      requires_mfa BOOLEAN DEFAULT false NOT NULL,
      access_password_hash TEXT,
      is_encrypted BOOLEAN DEFAULT true NOT NULL,
      encryption_key_id TEXT,
      expires_at TIMESTAMP,
      access_count INTEGER DEFAULT 0 NOT NULL,
      last_accessed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_access_log (
      id TEXT PRIMARY KEY NOT NULL,
      document_id TEXT NOT NULL REFERENCES secure_documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      access_type TEXT NOT NULL,
      mfa_verified BOOLEAN DEFAULT false NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS redaction_history (
      id TEXT PRIMARY KEY NOT NULL,
      source_document_id TEXT NOT NULL REFERENCES secure_documents(id) ON DELETE CASCADE,
      result_document_id TEXT REFERENCES secure_documents(id),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      template_id TEXT,
      redaction_count INTEGER DEFAULT 0 NOT NULL,
      redaction_areas JSONB,
      patterns_matched JSONB,
      is_permanent BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_redaction_templates (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Custom' NOT NULL,
      patterns JSONB,
      is_shared BOOLEAN DEFAULT false NOT NULL,
      usage_count INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

/**
 * Clean up test database
 */
export async function cleanupTestDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Clear all data from test database
 */
export async function clearTestData(db: NodePgDatabase<typeof schema>) {
  // Use TRUNCATE with CASCADE for efficient deletion
  await db.execute(sql`
    TRUNCATE
      custom_redaction_templates,
      redaction_history,
      document_access_log,
      secure_documents,
      consent_history,
      knowledge_articles,
      use_of_force_stats,
      agency_stats,
      audit_logs,
      appeals,
      comment_votes,
      comments,
      documents,
      foia_requests,
      request_templates,
      sessions,
      api_keys,
      agencies,
      users
    CASCADE;
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
export async function createAuthenticatedUser(_db: NodePgDatabase<typeof schema>) {
  const { authService } = await import('../src/services/auth.service');
  const userData = testData.user();
  const user = await authService.createUser(userData);
  const { token } = await authService.login(userData.email, userData.password);

  return { user, token, userData };
}
