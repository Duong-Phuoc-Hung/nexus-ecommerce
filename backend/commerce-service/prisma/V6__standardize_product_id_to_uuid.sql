-- =============================================================================
-- Project Nexus - Commerce Service Migration V6
-- Standardize product_id in commerce_cart_items, commerce_order_items, and commerce_stock_reservations to VARCHAR(36)
-- to support Catalog Service UUIDv7 product IDs
-- =============================================================================

ALTER TABLE commerce_cart_items ALTER COLUMN product_id TYPE VARCHAR(36) USING product_id::text;
ALTER TABLE commerce_order_items ALTER COLUMN product_id TYPE VARCHAR(36) USING product_id::text;
ALTER TABLE commerce_stock_reservations ALTER COLUMN product_id TYPE VARCHAR(36) USING product_id::text;
