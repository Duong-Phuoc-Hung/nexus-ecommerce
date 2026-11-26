-- =============================================================================
-- Project Nexus - Add order_id to catalog_product_reviews (T18 / SRS B-S03)
-- Prevents duplicate review collision across multiple orders of the same SKU
-- =============================================================================

ALTER TABLE catalog_product_reviews
  ADD COLUMN IF NOT EXISTS order_id VARCHAR(64) NULL;

CREATE INDEX IF NOT EXISTS idx_review_order
  ON catalog_product_reviews (order_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_review_product_user_order
  ON catalog_product_reviews (product_id, user_id, order_id)
  WHERE order_id IS NOT NULL;
