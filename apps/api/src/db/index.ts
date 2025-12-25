/**
 * @file Database Connection
 * @module db
 * @author FOIA Stream Team
 * @description Initializes and exports the SQLite database connection using Drizzle ORM.
 *              Configures WAL mode for improved concurrent performance.
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 */

// ============================================
// FOIA Stream - Database Connection
// ============================================

import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';

/**
 * Database file path from environment or default
 *
 * @constant
 * @type {string}
 */
const DB_PATH = process.env.DATABASE_URL || './data/foia-stream.db';

/**
 * Native Bun SQLite database instance
 *
 * @constant
 * @type {Database}
 * @description Creates or opens the SQLite database file with write-ahead logging enabled.
 */
const sqlite = new Database(DB_PATH, { create: true });

// Enable WAL mode for better concurrent read/write performance
sqlite.exec('PRAGMA journal_mode = WAL');

/**
 * Drizzle ORM database instance
 *
 * @constant
 * @type {ReturnType<typeof drizzle>}
 * @description Drizzle ORM wrapper around the SQLite connection with typed schema.
 *
 * @example
 * ```typescript
 * import { db } from './db';
 * import { users } from './db/schema';
 *
 * // Query users
 * const allUsers = await db.select().from(users);
 *
 * // Insert user
 * await db.insert(users).values({ ... });
 * ```
 */
export const db = drizzle(sqlite, { schema });

/**
 * Re-exported schema for type-safe queries
 * @see {@link ./schema}
 */
export { schema };

/**
 * Raw SQLite connection for migrations and direct queries
 * @description Use with caution - prefer Drizzle ORM methods for type safety
 */
export { sqlite };
