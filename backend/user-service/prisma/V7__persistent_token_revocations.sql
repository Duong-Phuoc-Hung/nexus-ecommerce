-- =============================================================================
-- Project Nexus - Persistent Multi-Replica Token Revocation (T01 / SRS 3.1)
-- Database: PostgreSQL (nexus_user_db - Port 5432)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_revoked_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user ON user_revoked_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON user_revoked_tokens (expires_at);

CREATE TABLE IF NOT EXISTS user_session_cutoffs (
    user_id VARCHAR(36) PRIMARY KEY,
    revoked_before_ms BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
