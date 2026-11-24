-- =============================================================================
-- Project Nexus - Commerce Service Migration V9
-- Escrow Settlement Columns for Safe Multi-Party Transactions (SRS 3.4)
-- =============================================================================

ALTER TABLE commerce_orders
  ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(20) DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS escrow_amount DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_order_escrow_status ON commerce_orders (escrow_status);
