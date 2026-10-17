-- =============================================================================
-- Learnova AI - PostgreSQL Initialization Script
-- =============================================================================

-- Ensure necessary extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Learnova AI PostgreSQL database initialized successfully with UUID extensions.';
END $$;
