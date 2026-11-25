-- =============================================================================
-- Project Nexus - Persistent Reputation Ledger & Appeals (T06 / A-N551-2)
-- Database: PostgreSQL (nexus_user_db - Port 5432)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_reputation_ledger (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    policy_version VARCHAR(32) NOT NULL DEFAULT '2026.11.v1',
    source_type VARCHAR(20) NOT NULL,
    source_id VARCHAR(120) NOT NULL,
    idempotency_key VARCHAR(220) NULL UNIQUE,
    requested_delta INT NOT NULL,
    applied_delta INT NOT NULL,
    score_before INT NOT NULL,
    score_after INT NOT NULL,
    reason TEXT NOT NULL,
    internal_note TEXT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    reversal_of_id VARCHAR(36) NULL,
    reversed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rep_ledger_user_created
    ON user_reputation_ledger (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_reputation_appeals (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    ledger_entry_id VARCHAR(36) NOT NULL,
    reason TEXT NOT NULL,
    evidence_note TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    resolution_note TEXT NULL,
    resolved_by VARCHAR(64) NULL,
    resolved_at TIMESTAMPTZ NULL,
    compensation_entry_id VARCHAR(36) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rep_appeals_user_created
    ON user_reputation_appeals (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rep_appeals_status
    ON user_reputation_appeals (status);
