// ============================================
// FOIA Stream - Database Connection
// ============================================

import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';

const DB_PATH = process.env.DATABASE_URL || './data/foia-stream.db';

// Create database connection using Bun's native SQLite
const sqlite = new Database(DB_PATH, { create: true });

// Enable WAL mode for better performance
sqlite.exec('PRAGMA journal_mode = WAL');

// Create Drizzle instance with schema
export const db = drizzle(sqlite, { schema });

// Export schema for use elsewhere
export { schema };

// Export raw sqlite connection for migrations
export { sqlite };
