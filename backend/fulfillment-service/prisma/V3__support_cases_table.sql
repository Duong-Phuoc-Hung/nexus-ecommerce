-- =============================================================================
-- Project Nexus - Fulfillment Service Migration V3
-- Create support cases table and extend shipments schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS fulfillment_support_cases (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    order_id VARCHAR(100) NOT NULL,
    order_code VARCHAR(100) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    customer VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    priority VARCHAR(30) NOT NULL DEFAULT 'Trung bình',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    resolution_note TEXT,
    resolved_by VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_case_user ON fulfillment_support_cases (user_id);
CREATE INDEX IF NOT EXISTS idx_support_case_order ON fulfillment_support_cases (order_id);
CREATE INDEX IF NOT EXISTS idx_support_case_status ON fulfillment_support_cases (status);
CREATE INDEX IF NOT EXISTS idx_support_case_priority ON fulfillment_support_cases (priority);
CREATE INDEX IF NOT EXISTS idx_support_case_created_at ON fulfillment_support_cases (created_at DESC);

-- Adjust shipments columns to support alphanumeric identifiers and rich tracking
ALTER TABLE fulfillment_shipments ALTER COLUMN id TYPE VARCHAR(100);
ALTER TABLE fulfillment_shipments ALTER COLUMN order_id TYPE VARCHAR(100);
ALTER TABLE fulfillment_shipments ALTER COLUMN warehouse_id DROP NOT NULL;
ALTER TABLE fulfillment_shipments ALTER COLUMN warehouse_id SET DEFAULT 1;
ALTER TABLE fulfillment_shipments ALTER COLUMN shipping_address TYPE TEXT;

ALTER TABLE fulfillment_shipments ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE fulfillment_shipments ADD COLUMN IF NOT EXISTS current_location VARCHAR(255);
ALTER TABLE fulfillment_shipments ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMPTZ;
ALTER TABLE fulfillment_shipments ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMPTZ;
