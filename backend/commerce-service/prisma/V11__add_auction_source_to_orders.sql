-- =============================================================================
-- Project Nexus - Commerce Service Migration V9
-- Lưu nguồn đơn hàng (DIRECT | AUCTION), mã phiên đấu giá & giá trúng gốc
-- =============================================================================

ALTER TABLE commerce_orders
  ADD COLUMN IF NOT EXISTS order_source VARCHAR(20) NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS auction_id VARCHAR(36),
  ADD COLUMN IF NOT EXISTS auction_winning_bid DECIMAL(12, 2);

CREATE INDEX IF NOT EXISTS idx_order_auction_id ON commerce_orders (auction_id);
CREATE INDEX IF NOT EXISTS idx_order_source ON commerce_orders (order_source);
