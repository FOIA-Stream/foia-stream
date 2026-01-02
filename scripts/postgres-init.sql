-- PostgreSQL initialization script
-- Runs automatically on first container startup (when data volume is empty)

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Trigram fuzzy text search
CREATE EXTENSION IF NOT EXISTS "citext";          -- Case-insensitive text
CREATE EXTENSION IF NOT EXISTS "btree_gin";       -- GIN index support for btree types

-- Grant necessary permissions to the foia user
ALTER USER foia WITH SUPERUSER;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL extensions initialized successfully';
END $$;
