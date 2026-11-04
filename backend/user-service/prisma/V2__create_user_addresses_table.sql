-- =============================================================================
-- Project Nexus - User Address Book Schema DDL (SRS 3.1 & P0 #3-7)
-- Database: PostgreSQL (nexus_user_db - Port 5432)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_addresses (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    label VARCHAR(50),
    recipient_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    province_code VARCHAR(10) NOT NULL,
    province_name VARCHAR(100) NOT NULL,
    ward_code VARCHAR(10) NOT NULL,
    ward_name VARCHAR(100) NOT NULL,
    street VARCHAR(255) NOT NULL,
    note TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_address_user FOREIGN KEY (user_id) REFERENCES user_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_default ON user_addresses (user_id, is_default) WHERE is_default = TRUE;
