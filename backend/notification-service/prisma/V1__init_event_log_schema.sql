-- =============================================================================
-- Project Nexus - Notification Service Migration (SCRUM-10)
-- Database: nexus_notification_db (Port 5437)
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_event_log (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    source_service VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_created_at ON notification_event_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_type ON notification_event_log (type);
CREATE INDEX IF NOT EXISTS idx_event_source ON notification_event_log (source_service);