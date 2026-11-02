-- =============================================================================
-- Project Nexus - Commerce Service Migration V3
-- Add support columns for order metadata and timeline
-- =============================================================================

ALTER TABLE commerce_orders 
  ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS buyer_email VARCHAR(100),
  ADD COLUMN IF NOT EXISTS seller_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;

ALTER TABLE commerce_order_items 
  ALTER COLUMN product_id TYPE VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_order_buyer_name ON commerce_orders (buyer_name);
CREATE INDEX IF NOT EXISTS idx_order_buyer_email ON commerce_orders (buyer_email);
CREATE INDEX IF NOT EXISTS idx_order_tracking_code ON commerce_orders (tracking_code);
