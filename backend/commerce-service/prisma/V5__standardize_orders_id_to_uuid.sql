-- =============================================================================
-- Project Nexus - Commerce Service Migration V5
-- Standardize commerce_orders.id and all foreign keys to VARCHAR(36) UUIDv7
-- =============================================================================

-- 1. Drop existing foreign key constraints pointing to commerce_orders(id)
ALTER TABLE IF EXISTS commerce_order_items DROP CONSTRAINT IF EXISTS fk_order_item_order;
ALTER TABLE IF EXISTS commerce_payments DROP CONSTRAINT IF EXISTS fk_payment_order;
ALTER TABLE IF EXISTS commerce_invoices DROP CONSTRAINT IF EXISTS fk_invoice_order;
ALTER TABLE IF EXISTS commerce_checkout_idempotency DROP CONSTRAINT IF EXISTS commerce_checkout_idempotency_order_id_fkey;
ALTER TABLE IF EXISTS commerce_stock_reservations DROP CONSTRAINT IF EXISTS commerce_stock_reservations_order_id_fkey;

-- 2. Convert commerce_orders.id to VARCHAR(36)
ALTER TABLE commerce_orders ALTER COLUMN id TYPE VARCHAR(36) USING id::text;
ALTER TABLE commerce_orders ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- 3. Convert referencing columns to VARCHAR(36)
ALTER TABLE commerce_order_items ALTER COLUMN order_id TYPE VARCHAR(36) USING order_id::text;
ALTER TABLE commerce_payments ALTER COLUMN order_id TYPE VARCHAR(36) USING order_id::text;
ALTER TABLE commerce_invoices ALTER COLUMN order_id TYPE VARCHAR(36) USING order_id::text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'commerce_checkout_idempotency' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE commerce_checkout_idempotency ALTER COLUMN order_id TYPE VARCHAR(36) USING order_id::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'commerce_stock_reservations' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE commerce_stock_reservations ALTER COLUMN order_id TYPE VARCHAR(36) USING order_id::text;
  END IF;
END $$;

-- 4. Re-establish foreign key constraints
ALTER TABLE commerce_order_items 
  ADD CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE CASCADE;

ALTER TABLE commerce_payments 
  ADD CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT;

ALTER TABLE commerce_invoices 
  ADD CONSTRAINT fk_invoice_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commerce_checkout_idempotency') THEN
    ALTER TABLE commerce_checkout_idempotency 
      ADD CONSTRAINT fk_checkout_idempotency_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commerce_stock_reservations') THEN
    ALTER TABLE commerce_stock_reservations 
      ADD CONSTRAINT fk_stock_reservations_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Chuẩn hóa ID mẫu của các đơn hàng seed sang UUIDv7 RFC 9562
UPDATE commerce_orders 
SET id = '019310c2-5501-7000-8000-000000008021' 
WHERE order_code = 'NX-ORD-8021';

UPDATE commerce_orders 
SET id = '019310c2-5501-7000-8000-000000008017' 
WHERE order_code = 'NX-ORD-8017';

UPDATE commerce_orders 
SET id = '019310c2-5501-7000-8000-000000008009' 
WHERE order_code = 'NX-ORD-8009';

UPDATE commerce_orders 
SET id = '019310c2-5501-7000-8000-000000007998' 
WHERE order_code = 'NX-ORD-7998';

UPDATE commerce_orders 
SET id = '019310c2-5501-7000-8000-00000000555a' 
WHERE order_code = 'ord_01hqz555abc' OR order_code = 'NX-ORD-555A';
