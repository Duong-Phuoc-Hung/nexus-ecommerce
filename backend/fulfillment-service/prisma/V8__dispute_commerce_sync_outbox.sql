-- =============================================================================
-- Project Nexus - Durable Dispute-to-Commerce Sync Outbox (T17 / B-S05..S08)
-- Database: PostgreSQL (nexus_fulfillment_db - Port 5436)
-- =============================================================================

CREATE TABLE IF NOT EXISTS fulfillment_dispute_sync_outbox (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL,
    order_id VARCHAR(64) NOT NULL,
    decision VARCHAR(40) NOT NULL,
    refund_amount DOUBLE PRECISION NULL,
    note TEXT NOT NULL,
    arbitrator_id VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(120) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 10,
    last_error TEXT NULL,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dispute_outbox_case ON fulfillment_dispute_sync_outbox (case_id);
CREATE INDEX IF NOT EXISTS idx_dispute_outbox_due ON fulfillment_dispute_sync_outbox (status, next_retry_at);
