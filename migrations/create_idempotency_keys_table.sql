-- ========================================================================
-- IDEMPOTENCY KEYS SYSTEM MIGRATION
-- ========================================================================
-- Purpose: Prevents duplicate API requests from creating duplicate resources
-- Use Case: Protects against double-clicks, network retries, race conditions
-- Created: 2025-01-25
-- ========================================================================

-- Create idempotency_keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    request_path VARCHAR(500) NOT NULL,
    request_method VARCHAR(10) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient cleanup of expired keys (older than 24 hours)
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
ON idempotency_keys(created_at);

-- Index for user-specific lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_id
ON idempotency_keys(user_id);

-- ========================================================================
-- USAGE NOTES:
-- ========================================================================
-- 1. Frontend generates UUID per operation (e.g., on form mount)
-- 2. Frontend sends key in 'Idempotency-Key' header
-- 3. Backend checks if key exists before processing
-- 4. If key exists: return cached response (no processing)
-- 5. If key is new: process request, store response with key
-- 6. Keys expire after 24 hours (cleaned by cron job)
--
-- Example SQL cleanup (run daily via cron):
-- DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '24 hours';
-- ========================================================================
