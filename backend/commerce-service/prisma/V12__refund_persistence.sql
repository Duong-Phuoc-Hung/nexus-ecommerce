-- V10: Bền vững metadata hoàn tiền (P0 false-success refund & reconciliation)
-- và ràng buộc duy nhất auction_id (SEC-06 chống tạo trùng đơn đấu giá).

ALTER TABLE commerce_orders
  ADD COLUMN IF NOT EXISTS refund_transaction_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS refund_amount BIGINT,
  ADD COLUMN IF NOT EXISTS refund_status VARCHAR(24);

CREATE UNIQUE INDEX IF NOT EXISTS uq_commerce_orders_auction_id
  ON commerce_orders (auction_id)
  WHERE auction_id IS NOT NULL AND status <> 'CANCELLED';
