-- =============================================================================
-- Project Nexus - Composite UNIQUE (warehouse_id, sku_code) on Inventory (T07 / A-F416-02)
-- Allows the same SKU to be tracked independently across multiple warehouses
-- =============================================================================

ALTER TABLE fulfillment_sku_inventories
  DROP CONSTRAINT IF EXISTS fulfillment_sku_inventories_sku_code_key;

DROP INDEX IF EXISTS fulfillment_sku_inventories_sku_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_warehouse_sku
  ON fulfillment_sku_inventories (warehouse_id, sku_code);
