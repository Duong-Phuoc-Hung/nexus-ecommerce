-- =============================================================================
-- Project Nexus - Notification Service Persistence Tables (T03 & T04)
-- Database: PostgreSQL (nexus_notification_db - Port 5437)
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_messages (
    id VARCHAR(80) PRIMARY KEY,
    recipient_id VARCHAR(64) NOT NULL,
    recipient_email VARCHAR(255) NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
    category VARCHAR(20) NOT NULL DEFAULT 'ACCOUNT',
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ NULL,
    href VARCHAR(512) NULL,
    idempotency_key VARCHAR(128) NULL UNIQUE,
    sent_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient_created
    ON notification_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_recipient_unread
    ON notification_messages (recipient_id, is_read);

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id VARCHAR(64) PRIMARY KEY,
    order_email BOOLEAN NOT NULL DEFAULT TRUE,
    order_push BOOLEAN NOT NULL DEFAULT TRUE,
    auction_email BOOLEAN NOT NULL DEFAULT TRUE,
    auction_push BOOLEAN NOT NULL DEFAULT TRUE,
    account_email BOOLEAN NOT NULL DEFAULT TRUE,
    account_push BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
