/**
 * Data Retention Service
 *
 * Implements automated data retention and purging per compliance policy.
 * References: compliance/privacy/data-retention-policy.md
 *
 * Retention Periods:
 * - Active FOIA requests: Indefinite
 * - Closed FOIA requests: 7 years
 * - Inactive user accounts: 2 years
 * - Audit logs: 7 years
 * - Session data: 30 days
 */

import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { Schema as S } from 'effect';
import { db } from '../db';
import { auditLogs, documents, foiaRequests, sessions, users } from '../db/schema';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Retention Period Type Schema
 */
const RetentionPeriodTypeSchema = S.Literal(
  'closedRequests',
  'inactiveUsers',
  'auditLogs',
  'sessions',
  'orphanedDocuments',
);

export type RetentionPeriodType = typeof RetentionPeriodTypeSchema.Type;

/**
 * Retention Periods Configuration Schema
 */
const RetentionPeriodsConfigSchema = S.Struct({
  closedRequests: S.Number,
  inactiveUsers: S.Number,
  auditLogs: S.Number,
  sessions: S.Number,
  orphanedDocuments: S.Number,
});

export type RetentionPeriodsConfig = typeof RetentionPeriodsConfigSchema.Type;

/**
 * Retention Result Schema
 */
const RetentionResultSchema = S.Struct({
  type: S.String,
  recordsEvaluated: S.Number,
  recordsPurged: S.Number,
  errors: S.Array(S.String),
  dryRun: S.Boolean,
});

export type RetentionResult = typeof RetentionResultSchema.Type;

/**
 * Retention Report Schema
 */
const RetentionReportSchema = S.Struct({
  executedAt: S.String,
  dryRun: S.Boolean,
  results: S.Array(RetentionResultSchema),
  totalPurged: S.Number,
});

export type RetentionReport = typeof RetentionReportSchema.Type;

/**
 * Session Stats Schema
 */
const SessionStatsSchema = S.Struct({
  total: S.Number,
  expiredCount: S.Number,
});

export type SessionStats = typeof SessionStatsSchema.Type;

/**
 * Request Stats Schema
 */
const RequestStatsSchema = S.Struct({
  total: S.Number,
  expiringCount: S.Number,
});

export type RequestStats = typeof RequestStatsSchema.Type;

/**
 * User Stats Schema
 */
const UserStatsSchema = S.Struct({
  total: S.Number,
  eligibleForPurge: S.Number,
});

export type UserStats = typeof UserStatsSchema.Type;

/**
 * Log Stats Schema
 */
const LogStatsSchema = S.Struct({
  total: S.Number,
  oldCount: S.Number,
});

export type LogStats = typeof LogStatsSchema.Type;

/**
 * Retention Stats Schema
 */
const RetentionStatsSchema = S.Struct({
  sessions: SessionStatsSchema,
  closedRequests: RequestStatsSchema,
  inactiveUsers: UserStatsSchema,
  auditLogs: LogStatsSchema,
});

export type RetentionStats = typeof RetentionStatsSchema.Type;

/**
 * Data Subject Deletion Result Schema
 */
const DataSubjectDeletionResultSchema = S.Struct({
  success: S.Boolean,
  anonymizedRecords: S.Number,
  errors: S.Array(S.String),
});

export type DataSubjectDeletionResult = typeof DataSubjectDeletionResultSchema.Type;

/**
 * Data Subject Request Schema
 */
const DataSubjectRequestSchema = S.Struct({
  userId: S.String,
  requestedBy: S.String,
  requestType: S.Literal('access', 'deletion', 'rectification', 'portability'),
  status: S.Literal('pending', 'processing', 'completed', 'denied'),
  requestDate: S.String,
  completedDate: S.optional(S.String),
});

export type DataSubjectRequest = typeof DataSubjectRequestSchema.Type;

// ============================================
// Configuration
// ============================================

const RETENTION_PERIODS: RetentionPeriodsConfig = {
  closedRequests: 7 * 365 * 24 * 60 * 60 * 1000,
  inactiveUsers: 2 * 365 * 24 * 60 * 60 * 1000,
  auditLogs: 7 * 365 * 24 * 60 * 60 * 1000,
  sessions: 30 * 24 * 60 * 60 * 1000,
  orphanedDocuments: 90 * 24 * 60 * 60 * 1000,
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate the cutoff date for a retention period
 */
function getCutoffDate(retentionMs: number): string {
  return new Date(Date.now() - retentionMs).toISOString();
}

/**
 * Create a retention result
 */
function createRetentionResult(
  type: string,
  recordsEvaluated: number,
  recordsPurged: number,
  errors: string[],
  dryRun: boolean,
): RetentionResult {
  return {
    type,
    recordsEvaluated,
    recordsPurged,
    errors,
    dryRun,
  };
}

// ============================================
// Retention Operations
// ============================================

/**
 * Purge expired sessions
 */
export async function purgeExpiredSessions(dryRun = true): Promise<RetentionResult> {
  const cutoff = getCutoffDate(RETENTION_PERIODS.sessions);
  const errors: string[] = [];

  try {
    const expiredSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(lt(sessions.expiresAt, cutoff));

    const count = expiredSessions.length;

    if (!dryRun && count > 0) {
      await db.delete(sessions).where(lt(sessions.expiresAt, cutoff));

      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        action: 'retention_delete',
        resourceType: 'session',
        resourceId: 'bulk',
        userId: null,
        details: {
          type: 'session_purge',
          count,
          retentionDays: 30,
        },
        ipAddress: 'system',
        userAgent: 'data-retention-service',
      });
    }

    return createRetentionResult('sessions', count, dryRun ? 0 : count, errors, dryRun);
  } catch (error) {
    errors.push(`Session purge failed: ${error}`);
    return createRetentionResult('sessions', 0, 0, errors, dryRun);
  }
}

/**
 * Purge old closed FOIA requests (7 year retention)
 */
export async function purgeClosedRequests(dryRun = true): Promise<RetentionResult> {
  const cutoff = getCutoffDate(RETENTION_PERIODS.closedRequests);
  const errors: string[] = [];

  try {
    const oldRequests = await db
      .select({ id: foiaRequests.id, trackingNumber: foiaRequests.trackingNumber })
      .from(foiaRequests)
      .where(
        and(
          sql`${foiaRequests.status} IN ('fulfilled', 'partially_fulfilled', 'denied', 'appeal_granted', 'appeal_denied', 'withdrawn')`,
          lt(foiaRequests.updatedAt, cutoff),
        ),
      );

    const count = oldRequests.length;

    if (!dryRun && count > 0) {
      for (const request of oldRequests) {
        await db.delete(documents).where(eq(documents.requestId, request.id));
      }

      await db
        .delete(foiaRequests)
        .where(
          and(
            sql`${foiaRequests.status} IN ('fulfilled', 'partially_fulfilled', 'denied', 'appeal_granted', 'appeal_denied', 'withdrawn')`,
            lt(foiaRequests.updatedAt, cutoff),
          ),
        );

      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        action: 'retention_delete',
        resourceType: 'foia_request',
        resourceId: 'bulk',
        userId: null,
        details: {
          type: 'closed_request_purge',
          count,
          retentionYears: 7,
          trackingNumbers: oldRequests.map((r) => r.trackingNumber),
        },
        ipAddress: 'system',
        userAgent: 'data-retention-service',
      });
    }

    return createRetentionResult('closed_requests', count, dryRun ? 0 : count, errors, dryRun);
  } catch (error) {
    errors.push(`Closed request purge failed: ${error}`);
    return createRetentionResult('closed_requests', 0, 0, errors, dryRun);
  }
}

/**
 * Purge inactive user accounts (2 year retention)
 */
export async function purgeInactiveUsers(dryRun = true): Promise<RetentionResult> {
  const cutoff = getCutoffDate(RETENTION_PERIODS.inactiveUsers);
  const errors: string[] = [];

  try {
    const inactiveUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(lt(users.updatedAt, cutoff), sql`${users.role} NOT IN ('admin')`));

    const count = inactiveUsers.length;

    if (!dryRun && count > 0) {
      for (const user of inactiveUsers) {
        await db
          .update(users)
          .set({
            email: `purged-${user.id}@deleted.local`,
            firstName: 'Purged',
            lastName: 'User',
            organization: null,
            passwordHash: 'PURGED',
            twoFactorSecret: null,
            twoFactorEnabled: false,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, user.id));
      }

      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        action: 'retention_delete',
        resourceType: 'user',
        resourceId: 'bulk',
        userId: null,
        details: {
          type: 'inactive_user_purge',
          count,
          retentionYears: 2,
          action: 'anonymized',
        },
        ipAddress: 'system',
        userAgent: 'data-retention-service',
      });
    }

    return createRetentionResult('inactive_users', count, dryRun ? 0 : count, errors, dryRun);
  } catch (error) {
    errors.push(`Inactive user purge failed: ${error}`);
    return createRetentionResult('inactive_users', 0, 0, errors, dryRun);
  }
}

/**
 * Purge old audit logs (7 year retention)
 */
export async function purgeOldAuditLogs(dryRun = true): Promise<RetentionResult> {
  const cutoff = getCutoffDate(RETENTION_PERIODS.auditLogs);
  const errors: string[] = [];

  try {
    const oldLogs = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(lt(auditLogs.createdAt, cutoff));

    const count = oldLogs.length;

    if (!dryRun && count > 0) {
      await db.delete(auditLogs).where(lt(auditLogs.createdAt, cutoff));
    }

    return createRetentionResult('audit_logs', count, dryRun ? 0 : count, errors, dryRun);
  } catch (error) {
    errors.push(`Audit log purge failed: ${error}`);
    return createRetentionResult('audit_logs', 0, 0, errors, dryRun);
  }
}

/**
 * Purge orphaned documents (no associated request)
 */
export async function purgeOrphanedDocuments(dryRun = true): Promise<RetentionResult> {
  const cutoff = getCutoffDate(RETENTION_PERIODS.orphanedDocuments);
  const errors: string[] = [];

  try {
    const orphaned = await db
      .select({ id: documents.id, fileName: documents.fileName })
      .from(documents)
      .where(and(isNull(documents.requestId), lt(documents.createdAt, cutoff)));

    const count = orphaned.length;

    if (!dryRun && count > 0) {
      await db
        .delete(documents)
        .where(and(isNull(documents.requestId), lt(documents.createdAt, cutoff)));

      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        action: 'retention_delete',
        resourceType: 'document',
        resourceId: 'bulk',
        userId: null,
        details: {
          type: 'orphaned_document_purge',
          count,
          retentionDays: 90,
        },
        ipAddress: 'system',
        userAgent: 'data-retention-service',
      });
    }

    return createRetentionResult('orphaned_documents', count, dryRun ? 0 : count, errors, dryRun);
  } catch (error) {
    errors.push(`Orphaned document purge failed: ${error}`);
    return createRetentionResult('orphaned_documents', 0, 0, errors, dryRun);
  }
}

/**
 * Run full data retention process
 */
export async function runDataRetention(dryRun = true): Promise<RetentionReport> {
  const results: RetentionResult[] = [];

  results.push(await purgeExpiredSessions(dryRun));
  results.push(await purgeClosedRequests(dryRun));
  results.push(await purgeInactiveUsers(dryRun));
  results.push(await purgeOldAuditLogs(dryRun));
  results.push(await purgeOrphanedDocuments(dryRun));

  const totalPurged = results.reduce((sum, r) => sum + r.recordsPurged, 0);

  return {
    executedAt: new Date().toISOString(),
    dryRun,
    results,
    totalPurged,
  };
}

/**
 * Get retention statistics
 */
export async function getRetentionStats(): Promise<RetentionStats> {
  const sessionCutoff = getCutoffDate(RETENTION_PERIODS.sessions);
  const requestCutoff = getCutoffDate(RETENTION_PERIODS.closedRequests);
  const userCutoff = getCutoffDate(RETENTION_PERIODS.inactiveUsers);
  const logCutoff = getCutoffDate(RETENTION_PERIODS.auditLogs);

  const [
    totalSessions,
    expiredSessions,
    totalClosed,
    expiringRequests,
    totalUsers,
    inactiveUsersCount,
    totalLogs,
    oldLogs,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(sessions),
    db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(lt(sessions.expiresAt, sessionCutoff)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(foiaRequests)
      .where(sql`${foiaRequests.status} IN ('fulfilled', 'denied', 'withdrawn')`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(foiaRequests)
      .where(
        and(
          sql`${foiaRequests.status} IN ('fulfilled', 'denied', 'withdrawn')`,
          lt(foiaRequests.updatedAt, requestCutoff),
        ),
      ),
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(users).where(lt(users.updatedAt, userCutoff)),
    db.select({ count: sql<number>`count(*)` }).from(auditLogs),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(lt(auditLogs.createdAt, logCutoff)),
  ]);

  return {
    sessions: {
      total: totalSessions[0]?.count ?? 0,
      expiredCount: expiredSessions[0]?.count ?? 0,
    },
    closedRequests: {
      total: totalClosed[0]?.count ?? 0,
      expiringCount: expiringRequests[0]?.count ?? 0,
    },
    inactiveUsers: {
      total: totalUsers[0]?.count ?? 0,
      eligibleForPurge: inactiveUsersCount[0]?.count ?? 0,
    },
    auditLogs: {
      total: totalLogs[0]?.count ?? 0,
      oldCount: oldLogs[0]?.count ?? 0,
    },
  };
}

/**
 * Process data subject deletion request (GDPR/CCPA)
 */
export async function processDataSubjectDeletion(
  userId: string,
  requestedBy: string,
): Promise<DataSubjectDeletionResult> {
  const errors: string[] = [];
  let anonymizedRecords = 0;

  try {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user[0]) {
      return { success: false, anonymizedRecords: 0, errors: ['User not found'] };
    }

    await db
      .update(users)
      .set({
        email: `deleted-${userId}@redacted.local`,
        firstName: 'Deleted',
        lastName: 'User',
        organization: null,
        passwordHash: 'DELETED',
        twoFactorSecret: null,
        twoFactorEnabled: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));
    anonymizedRecords++;

    await db
      .update(foiaRequests)
      .set({
        title: '[Redacted per data subject request]',
        description: '[Content redacted per data subject request]',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(foiaRequests.userId, userId));

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      action: 'user_deleted',
      resourceType: 'user',
      resourceId: userId,
      userId: requestedBy,
      details: {
        type: 'data_subject_request',
        originalEmail: user[0].email,
        requestDate: new Date().toISOString(),
      },
      ipAddress: 'system',
      userAgent: 'data-retention-service',
    });

    return { success: true, anonymizedRecords, errors };
  } catch (error) {
    errors.push(`Deletion failed: ${error}`);
    return { success: false, anonymizedRecords, errors };
  }
}

// Export service object
export const DataRetentionService = {
  purgeExpiredSessions,
  purgeClosedRequests,
  purgeInactiveUsers,
  purgeOldAuditLogs,
  purgeOrphanedDocuments,
  runDataRetention,
  getRetentionStats,
  processDataSubjectDeletion,
  RETENTION_PERIODS,
};

// Export schemas for external validation
export {
  DataSubjectDeletionResultSchema,
  DataSubjectRequestSchema,
  LogStatsSchema,
  RequestStatsSchema,
  RetentionPeriodsConfigSchema,
  RetentionPeriodTypeSchema,
  RetentionReportSchema,
  RetentionResultSchema,
  RetentionStatsSchema,
  SessionStatsSchema,
  UserStatsSchema,
};
