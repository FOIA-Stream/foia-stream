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

/**
 * @file Database Connection
 * @module db
 * @author FOIA Stream Team
 * @description Initializes and exports the PostgreSQL database connection using Drizzle ORM.
 *              Configures connection pooling for optimal concurrent performance.
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 */

// ============================================
// FOIA Stream - Database Connection
// ============================================

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Database connection string from environment
 *
 * @constant
 * @type {string}
 */
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/foia_stream';

/**
 * PostgreSQL connection pool
 *
 * @constant
 * @type {Pool}
 * @description Creates a connection pool for efficient database connections.
 *              Bun and Node.js compatible.
 */
const pool = new Pool({
  connectionString: DATABASE_URL,
  // Connection pool settings for production
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout for new connections
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Drizzle ORM database instance
 *
 * @constant
 * @type {ReturnType<typeof drizzle>}
 * @description Drizzle ORM wrapper around the PostgreSQL connection with typed schema.
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
export const db = drizzle(pool, { schema });

/**
 * Re-exported schema for type-safe queries
 * @see {@link ./schema}
 */
export { schema };

/**
 * Raw PostgreSQL connection pool for direct queries or shutdown
 * @description Use with caution - prefer Drizzle ORM methods for type safety
 */
export { pool };

/**
 * Graceful shutdown helper
 * @description Call this before process exit to close all pool connections
 */
export async function closeDb(): Promise<void> {
  await pool.end();
}
